import { getStore } from '@netlify/blobs'
import { STORES } from '../../src/lib/blob-stores'
import {
  deveEnviarLembreteSimulado,
  instanteInicioSimulado,
  type FaseLembreteSimulado,
} from '../../src/lib/lembrete-simulado-horario'
import { montarEmailLembreteSimulado } from '../../src/lib/email-lembrete-simulado'
import { enviarEmail } from '../../src/lib/email'
import { listApprovedStudents } from '../../src/lib/student-evolution'

// Roda a cada 15 minutos e envia os lembretes de simulado/simuladão e da
// correção deles:
//  - véspera: 18h de Brasília do dia anterior
//  - 30 min antes do horário marcado (só quando tem horário)
//
// A cada 15 min, e não de hora em hora como o lembrete de mentoria, porque
// aqui existe o lembrete de "30 minutos antes" — precisão de horas não serve.
export const config = { schedule: '*/15 * * * *' }

// Fora dessa janela antes do início, o alvo nem é considerado — evita varrer a
// agenda inteira toda execução. 27h cobre a véspera (18h da véspera de um
// simulado às 21h = 27h de antecedência) com folga.
const JANELA_ANTECEDENCIA_MS = 27 * 60 * 60 * 1000

const TIPOS_SIMULADO = new Set(['simulado', 'simuladao'])
const ROTULO_TIPO: Record<string, string> = {
  simulado: 'Simulado',
  simuladao: 'Simuladão',
}
const FASES: FaseLembreteSimulado[] = ['vespera', '30min']

// Sem UI esperando resposta (é uma função agendada, ninguém olha spinner):
// dá mais tempo pro Resend responder antes de desistir, reduzindo quanto cai
// no caso "não sabemos se saiu" — ver o comentário em ResultadoEnvio.
const ENVIO_TIMEOUT_MS = 15_000

type Correcao = {
  date: string
  time: string
  endTime: string
  link: string
  description: string
}

type EventoCalendario = {
  id: string
  date: string
  time: string
  type: string
  title: string
  correction?: Correcao | null
}

type Contexto = 'prova' | 'correcao'
type Alvo = {
  eventoId: string
  contexto: Contexto
  tipo: string
  titulo: string
  date: string
  time: string
  link: string
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

function chaveLembrete(alvo: Alvo, email: string, fase: FaseLembreteSimulado) {
  // E-mail em minúsculo na chave pra não gerar dois registros do mesmo aluno
  // por diferença de caixa.
  return `${alvo.eventoId}__${alvo.contexto}__${email.toLowerCase()}__${fase}`
}

export default async function handler() {
  const agora = new Date()
  const agoraMs = agora.getTime()

  const [eventos, aprovados] = await Promise.all([
    lerJson<EventoCalendario>(STORES.eventosCalendario),
    // Diretório de verdade do Identity (mesma função usada no painel de
    // evolução), não `session-history`: aquele store guarda todo mundo que já
    // logou algum dia e nunca é limpo, então um aluno removido/reprovado
    // continuava recebendo lembrete de simulado pra sempre.
    listApprovedStudents(),
  ])

  // Cada simulado rende até dois alvos: a prova e a correção (quando cadastrada).
  const alvos: Alvo[] = []
  for (const { valor: evento } of eventos) {
    if (!TIPOS_SIMULADO.has(evento.type)) continue
    const tipo = ROTULO_TIPO[evento.type] ?? 'Simulado'
    alvos.push({
      eventoId: evento.id, contexto: 'prova', tipo, titulo: evento.title,
      date: evento.date, time: evento.time, link: '',
    })
    if (evento.correction?.date) {
      alvos.push({
        eventoId: evento.id,
        contexto: 'correcao',
        tipo,
        titulo: evento.correction.description?.trim() || `Correção — ${evento.title}`,
        date: evento.correction.date,
        time: evento.correction.time || '',
        link: evento.correction.link || '',
      })
    }
  }

  const pendentes = alvos.filter((alvo) => {
    const inicioMs = instanteInicioSimulado(alvo.date, alvo.time)
    return inicioMs > agoraMs && inicioMs - agoraMs <= JANELA_ANTECEDENCIA_MS
  })

  const destinatarios = aprovados
    .filter((u): u is typeof u & { email: string } => Boolean(u.email))
    .map((u) => ({ email: u.email, name: u.name || 'Aluno(a)' }))

  const store = getStore({ name: STORES.lembretesSimulado, consistency: 'strong' })
  let enviados = 0
  let jaEnviados = 0
  let semChave = 0
  let indeterminados = 0
  const erros: string[] = []

  for (const alvo of pendentes) {
    for (const fase of FASES) {
      if (!deveEnviarLembreteSimulado(fase, alvo.date, alvo.time, agora)) continue

      for (const aluno of destinatarios) {
        const chave = chaveLembrete(alvo, aluno.email, fase)

        // Idempotência atômica: reserva a chave ANTES de enviar, com onlyIfNew.
        // Se já existe (aluno já recebeu, ou outra execução concorrente acabou
        // de reservar), pula.
        const claim = await store.setJSON(
          chave,
          { chave, eventoId: alvo.eventoId, contexto: alvo.contexto, email: aluno.email, fase, enviadoEm: agora.toISOString() },
          { onlyIfNew: true },
        )
        if (!claim?.modified) {
          jaEnviados += 1
          continue
        }

        const { assunto, html, texto } = montarEmailLembreteSimulado({
          nomeAluno: aluno.name || 'Aluno(a)',
          tipo: alvo.tipo,
          titulo: alvo.titulo,
          data: alvo.date,
          hora: alvo.time,
          fase,
          contexto: alvo.contexto,
          link: alvo.link || undefined,
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
          erros.push(`${aluno.email} (${alvo.eventoId}/${alvo.contexto}/${fase}): ${resultado.motivo}`)
          continue
        }

        enviados += 1
      }
    }
  }

  const resumo = { alvos: pendentes.length, destinatarios: destinatarios.length, enviados, jaEnviados, semChave, indeterminados, erros }
  console.log('[lembrete-simulado]', JSON.stringify(resumo))

  if (semChave > 0) {
    console.warn('[lembrete-simulado] RESEND_API_KEY não configurada — nenhum e-mail enviado.')
  }
  if (indeterminados > 0) {
    // Não é um erro de verdade (o e-mail pode ter saído) — só um aviso de que
    // ficaram lembretes sem confirmação de envio, sem retentativa automática
    // pra não arriscar duplicar. Vale conferir no painel do Resend se sobrou
    // alguém sem receber.
    console.warn(`[lembrete-simulado] ${indeterminados} envio(s) com resultado indeterminado (timeout/rede) — sem retentativa automática, ver detalhes abaixo.`)
  }
  for (const erro of erros) console.error('[lembrete-simulado] falha no envio —', erro)

  return new Response(JSON.stringify(resumo), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}
