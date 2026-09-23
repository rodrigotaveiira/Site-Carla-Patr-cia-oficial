import { getStore } from '@netlify/blobs'
import { STORES } from '../../src/lib/blob-stores'
import { deveEnviarLembrete } from '../../src/lib/lembrete-horario'
import { montarEmailLembrete, type CompromissoDoDia } from '../../src/lib/email-lembrete-mentoria'
import { enviarEmail } from '../../src/lib/email'

// Roda de hora em hora e envia o lembrete de confirmação de presença das
// mentorias cuja hora de envio já chegou (ver lembrete-horario.ts pra regra).
//
// De hora em hora, e não a cada 15 minutos, porque a precisão do lembrete é da
// ordem de horas — rodar mais vezes só gastaria execução à toa.
export const config = { schedule: '@hourly' }

const SITE_URL = 'https://carlapatriciamedina.com'

// Sem UI esperando resposta (é uma função agendada, ninguém olha spinner):
// dá mais tempo pro Resend responder antes de desistir, reduzindo quanto cai
// no caso "não sabemos se saiu" — ver o comentário em ResultadoEnvio.
const ENVIO_TIMEOUT_MS = 15_000

type MentoriaSlot = {
  id: string
  date: string
  time: string
  duration: number
  status: 'available' | 'booked'
  student: { email: string; name: string } | null
}

type MentoriaGrupoSlot = {
  id: string
  date: string
  time: string
  duration: number
  students: { email: string; name: string }[]
}

type EventoCalendario = {
  id: string
  date: string
  time: string
  type: string
  title: string
}

const ROTULOS_EVENTO: Record<string, string> = {
  'aula-ao-vivo': 'Aula ao vivo',
  aula: 'Aula liberada',
  simulado: 'Simulado',
  simuladao: 'Simuladão',
  outro: 'Agenda',
}

// Um registro por destinatário de cada mentoria: o mesmo grupo tem vários
// alunos, e cada um precisa do próprio token de confirmação.
type RegistroLembrete = {
  chave: string
  slotId: string
  email: string
  token: string
  enviadoEm: string
  confirmadoEm: string | null
}

function lembretesStore() {
  return getStore({ name: STORES.lembretesMentoria, consistency: 'strong' })
}

async function lerJson<T>(storeName: string): Promise<T[]> {
  const store = getStore({ name: storeName, consistency: 'strong' })
  const { blobs } = await store.list()
  const itens: T[] = []
  for (const blob of blobs) {
    const valor = await store.get(blob.key, { type: 'json' })
    if (valor) itens.push(valor as T)
  }
  return itens
}

function chaveLembrete(slotId: string, email: string) {
  // O e-mail entra na chave em minúsculo pra não gerar dois registros do mesmo
  // aluno por diferença de caixa.
  return `${slotId}__${email.toLowerCase()}`
}

export default async function handler() {
  const agora = new Date()

  // DIAGNÓSTICO TEMPORÁRIO — investigando por que o mesmo lembrete sai de
  // novo a cada execução (ver conversa com o usuário, 2026-09-23). Remove
  // assim que a causa for confirmada.
  try {
    const diag = getStore({ name: STORES.lembretesMentoria, consistency: 'strong' })
    const anterior = (await diag.get('__diagnostico__', { type: 'json' })) as { contagem: number; historico: string[] } | null
    const contagem = (anterior?.contagem ?? 0) + 1
    const historico = [...(anterior?.historico ?? []), agora.toISOString()].slice(-5)
    await diag.setJSON('__diagnostico__', { contagem, historico })
    console.log('[lembrete-mentoria] DIAG contagem persistida entre execuções:', contagem, '| NETLIFY_BLOBS_CONTEXT presente?', Boolean(process.env.NETLIFY_BLOBS_CONTEXT), '| DEPLOY_ID:', process.env.DEPLOY_ID, '| historico:', JSON.stringify(historico))
  } catch (diagErro) {
    console.error('[lembrete-mentoria] DIAG erro ao ler/gravar:', diagErro instanceof Error ? diagErro.message : diagErro)
  }

  const [individuais, grupos, eventos] = await Promise.all([
    lerJson<MentoriaSlot>(STORES.mentorias),
    lerJson<MentoriaGrupoSlot>(STORES.mentoriasGrupo),
    lerJson<EventoCalendario>(STORES.eventosCalendario),
  ])

  // Achata as duas fontes num alvo por (mentoria, aluno).
  type Alvo = { slotId: string; date: string; time: string; duration: number; emGrupo: boolean; email: string; nome: string }
  const alvos: Alvo[] = []

  for (const slot of individuais) {
    if (slot.status !== 'booked' || !slot.student?.email) continue
    alvos.push({
      slotId: slot.id, date: slot.date, time: slot.time, duration: slot.duration,
      emGrupo: false, email: slot.student.email, nome: slot.student.name,
    })
  }

  for (const slot of grupos) {
    for (const aluno of slot.students ?? []) {
      if (!aluno.email) continue
      alvos.push({
        slotId: slot.id, date: slot.date, time: slot.time, duration: slot.duration,
        emGrupo: true, email: aluno.email, nome: aluno.name,
      })
    }
  }

  const pendentes = alvos.filter((alvo) => deveEnviarLembrete(alvo.date, alvo.time, agora))

  const store = lembretesStore()
  let enviados = 0
  let jaEnviados = 0
  let semChave = 0
  let indeterminados = 0
  const erros: string[] = []

  for (const alvo of pendentes) {
    const chave = chaveLembrete(alvo.slotId, alvo.email)

    // Idempotência atômica: reserva a chave ANTES de mandar o e-mail, com
    // `onlyIfNew`. Se já existe (esse aluno já recebeu, OU outra execução
    // concorrente acabou de reservar), pula. Sem o `onlyIfNew`, duas
    // execuções quase simultâneas (retry do Netlify, disparo manual junto
    // do cron) fariam ambas lerem "não existe" e mandarem o mesmo lembrete
    // duas vezes.
    const claimResult = await store.setJSON(
      chave,
      { chave, slotId: alvo.slotId, email: alvo.email, token: '', enviadoEm: agora.toISOString(), confirmadoEm: null } satisfies RegistroLembrete,
      { onlyIfNew: true },
    )
    if (!claimResult?.modified) {
      jaEnviados += 1
      continue
    }

    const compromissos: CompromissoDoDia[] = eventos
      .filter((evento) => evento.date === alvo.date)
      .map((evento) => ({
        hora: evento.time,
        titulo: evento.title,
        tipo: ROTULOS_EVENTO[evento.type] ?? 'Agenda',
      }))
      .sort((a, b) => a.hora.localeCompare(b.hora))

    const token = crypto.randomUUID()
    const { assunto, html, texto } = montarEmailLembrete({
      nomeAluno: alvo.nome,
      data: alvo.date,
      hora: alvo.time,
      duracao: alvo.duration,
      emGrupo: alvo.emGrupo,
      compromissos,
      linkConfirmacao: `${SITE_URL}/confirmar-presenca?t=${token}`,
    })

    const resultado = await enviarEmail({ para: alvo.email, assunto, html, texto, timeoutMs: ENVIO_TIMEOUT_MS })

    if (resultado.status === 'nao-configurado') {
      // Sem RESEND_API_KEY o e-mail não saiu: libera a chave reservada pra
      // que, quando a chave for configurada, o lembrete saia na execução
      // seguinte em vez de ter sido perdido silenciosamente.
      await store.delete(chave)
      semChave += 1
      continue
    }

    if (resultado.status === 'erro') {
      if (resultado.ambiguo) {
        // Timeout ou falha de rede: não sabemos se o Resend chegou a
        // processar o envio antes da conexão cair. Mantém a chave reservada
        // — o aluno pode, no pior caso, não receber ESTE lembrete, mas nunca
        // recebe o mesmo duas vezes.
        indeterminados += 1
      } else {
        // O Resend respondeu recusando: temos certeza de que não saiu, então
        // libera a chave pra tentar de novo na próxima execução.
        await store.delete(chave)
      }
      erros.push(`${alvo.email}: ${resultado.motivo}`)
      continue
    }

    const registro: RegistroLembrete = {
      chave,
      slotId: alvo.slotId,
      email: alvo.email,
      token,
      enviadoEm: agora.toISOString(),
      confirmadoEm: null,
    }
    // Atualiza a chave já reservada com o token real do envio.
    await store.setJSON(chave, registro)
    // Índice por token, pra tela de confirmação achar o registro sem varrer tudo.
    await store.setJSON(`token__${token}`, registro)
    enviados += 1
  }

  const resumo = { pendentes: pendentes.length, enviados, jaEnviados, semChave, indeterminados, erros }
  console.log('[lembrete-mentoria]', JSON.stringify(resumo))

  if (semChave > 0) {
    console.warn('[lembrete-mentoria] RESEND_API_KEY não configurada — nenhum e-mail enviado.')
  }
  if (indeterminados > 0) {
    // Não é um erro de verdade (o e-mail pode ter saído) — só um aviso de que
    // ficaram lembretes sem confirmação de envio, sem retentativa automática
    // pra não arriscar duplicar. Vale conferir no painel do Resend se sobrou
    // alguém sem receber.
    console.warn(`[lembrete-mentoria] ${indeterminados} envio(s) com resultado indeterminado (timeout/rede) — sem retentativa automática, ver detalhes abaixo.`)
  }
  for (const erro of erros) console.error('[lembrete-mentoria] falha no envio —', erro)

  return new Response(JSON.stringify(resumo), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}
