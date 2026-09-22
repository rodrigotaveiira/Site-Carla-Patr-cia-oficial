import { getStore } from '@netlify/blobs'
import { STORES } from '../../src/lib/blob-stores'
import { instanteInicioSimulado, instanteLembrete30min } from '../../src/lib/lembrete-simulado-horario'
import { montarEmailLembreteAula } from '../../src/lib/email-lembrete-aula'
import { enviarEmail } from '../../src/lib/email'
import { listApprovedStudents } from '../../src/lib/student-evolution'

// Roda a cada 15 minutos e envia o lembrete de aula ao vivo, 30 min antes do
// horário marcado, pra todos os alunos aprovados — mesmo padrão de
// lembrete-simulado.mts, só que com uma fase só (aula sem horário não gera
// lembrete, então não existe o caso "sem hora" que o simulado trata).
//
// Reaproveita as contas de horário de lembrete-simulado-horario.ts: apesar do
// nome do arquivo, a matemática (fuso de Brasília, 30 min antes) não tem nada
// de específico de simulado.
export const config = { schedule: '*/15 * * * *' }

const SITE_URL = 'https://carlapatriciamedina.com'

// Fora dessa janela antes do início, o alvo nem é considerado — evita varrer a
// agenda inteira toda execução.
const JANELA_ANTECEDENCIA_MS = 2 * 60 * 60 * 1000

// Sem UI esperando resposta (é uma função agendada, ninguém olha spinner):
// dá mais tempo pro Resend responder antes de desistir, reduzindo quanto cai
// no caso "não sabemos se saiu" — ver o comentário em ResultadoEnvio.
const ENVIO_TIMEOUT_MS = 15_000

type EventoCalendario = {
  id: string
  date: string
  time: string
  type: string
  title: string
  link: string
}

// Um registro por (aula, aluno) já avisado — chave de idempotência. Guarda
// token e data/hora direto aqui, não em cima do evento do calendário, pra
// `confirmarPresenca` responder mesmo que o evento tenha sido editado ou
// apagado depois do envio.
type RegistroLembreteAula = {
  chave: string
  eventoId: string
  email: string
  token: string
  data: string
  hora: string
  enviadoEm: string
  confirmadoEm: string | null
}

async function lerJson<T>(storeName: string): Promise<{ key: string; valor: T }[]> {
  const store = getStore({ name: storeName, consistency: 'strong' })
  const { blobs } = await store.list()
  const itens: { key: string; valor: T }[] = []
  for (const blob of blobs) {
    const valor = await store.get(blob.key, { type: 'json' })
    if (valor) itens.push({ key: blob.key, valor: valor as T })
  }
  return itens
}

function chaveLembrete(eventoId: string, email: string) {
  // E-mail em minúsculo na chave pra não gerar dois registros do mesmo aluno
  // por diferença de caixa.
  return `${eventoId}__${email.toLowerCase()}`
}

function deveEnviarLembreteAula(date: string, time: string, agora: Date): boolean {
  if (!time) return false // aula sem horário marcado não gera lembrete de "30 min antes"
  const agoraMs = agora.getTime()
  if (agoraMs >= instanteInicioSimulado(date, time)) return false
  const alvo = instanteLembrete30min(date, time)
  if (alvo === null) return false
  return agoraMs >= alvo
}

export default async function handler() {
  const agora = new Date()
  const agoraMs = agora.getTime()

  const [eventos, aprovados] = await Promise.all([
    lerJson<EventoCalendario>(STORES.eventosCalendario),
    // Diretório de verdade do Identity (mesma função usada no lembrete de
    // simulado), não `session-history`: aquele store guarda todo mundo que já
    // logou algum dia e nunca é limpo, então um aluno removido/reprovado
    // continuaria recebendo lembrete de aula pra sempre.
    listApprovedStudents(),
  ])

  const alvos = eventos
    .map(({ valor }) => valor)
    .filter((evento) => evento.type === 'aula-ao-vivo' && evento.time)
    .filter((evento) => {
      const inicioMs = instanteInicioSimulado(evento.date, evento.time)
      return inicioMs > agoraMs && inicioMs - agoraMs <= JANELA_ANTECEDENCIA_MS
    })

  const destinatarios = aprovados
    .filter((u): u is typeof u & { email: string } => Boolean(u.email))
    .map((u) => ({ email: u.email, name: u.name || 'Aluno(a)' }))

  const store = getStore({ name: STORES.lembretesAula, consistency: 'strong' })
  let enviados = 0
  let jaEnviados = 0
  let semChave = 0
  let indeterminados = 0
  const erros: string[] = []

  for (const evento of alvos) {
    if (!deveEnviarLembreteAula(evento.date, evento.time, agora)) continue

    for (const aluno of destinatarios) {
      const chave = chaveLembrete(evento.id, aluno.email)

      // Idempotência atômica: reserva a chave ANTES de enviar, com onlyIfNew.
      // Token vazio por enquanto — só entra depois do envio confirmado.
      const claim = await store.setJSON(
        chave,
        {
          chave, eventoId: evento.id, email: aluno.email, token: '',
          data: evento.date, hora: evento.time, enviadoEm: agora.toISOString(), confirmadoEm: null,
        } satisfies RegistroLembreteAula,
        { onlyIfNew: true },
      )
      if (!claim?.modified) {
        jaEnviados += 1
        continue
      }

      const token = crypto.randomUUID()
      const { assunto, html, texto } = montarEmailLembreteAula({
        nomeAluno: aluno.name || 'Aluno(a)',
        titulo: evento.title,
        data: evento.date,
        hora: evento.time,
        link: evento.link || undefined,
        linkConfirmacao: `${SITE_URL}/confirmar-presenca?t=${token}`,
      })

      const resultado = await enviarEmail({ para: aluno.email, assunto, html, texto, timeoutMs: ENVIO_TIMEOUT_MS })

      if (resultado.status === 'nao-configurado') {
        // Sem RESEND_API_KEY o e-mail não saiu: libera a chave reservada pra
        // que o lembrete saia numa execução seguinte, quando a chave existir.
        await store.delete(chave)
        semChave += 1
        continue
      }

      if (resultado.status === 'erro') {
        if (resultado.ambiguo) {
          // Timeout ou falha de rede: não sabemos se o Resend chegou a
          // processar o envio antes da conexão cair. Mantém a chave
          // reservada — o aluno pode, no pior caso, não receber ESTE
          // lembrete, mas nunca recebe o mesmo duas vezes.
          indeterminados += 1
        } else {
          // O Resend respondeu recusando: temos certeza de que não saiu,
          // então libera a chave pra tentar de novo na próxima execução.
          await store.delete(chave)
        }
        erros.push(`${aluno.email} (${evento.id}): ${resultado.motivo}`)
        continue
      }

      const registro: RegistroLembreteAula = {
        chave, eventoId: evento.id, email: aluno.email, token,
        data: evento.date, hora: evento.time, enviadoEm: agora.toISOString(), confirmadoEm: null,
      }
      // Atualiza a chave já reservada com o token real do envio.
      await store.setJSON(chave, registro)
      // Índice por token, pra tela de confirmação achar o registro sem varrer tudo.
      await store.setJSON(`token__${token}`, registro)
      enviados += 1
    }
  }

  const resumo = { alvos: alvos.length, destinatarios: destinatarios.length, enviados, jaEnviados, semChave, indeterminados, erros }
  console.log('[lembrete-aula]', JSON.stringify(resumo))

  if (semChave > 0) {
    console.warn('[lembrete-aula] RESEND_API_KEY não configurada — nenhum e-mail enviado.')
  }
  if (indeterminados > 0) {
    console.warn(`[lembrete-aula] ${indeterminados} envio(s) com resultado indeterminado (timeout/rede) — sem retentativa automática, ver detalhes abaixo.`)
  }
  for (const erro of erros) console.error('[lembrete-aula] falha no envio —', erro)

  return new Response(JSON.stringify(resumo), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}
