import { getStore } from '@netlify/blobs'
import { STORES } from '../../src/lib/blob-stores'
import {
  deveEnviarLembreteSimulado,
  instanteInicioSimulado,
  type FaseLembreteSimulado,
} from '../../src/lib/lembrete-simulado-horario'
import { montarEmailLembreteSimulado } from '../../src/lib/email-lembrete-simulado'
import { enviarEmail } from '../../src/lib/email'

// Roda a cada 15 minutos e envia os lembretes de simulado/simuladão:
//  - véspera: 18h de Brasília do dia anterior
//  - 30 min antes do horário marcado (só quando o evento tem horário)
//
// A cada 15 min, e não de hora em hora como o lembrete de mentoria, porque
// aqui existe o lembrete de "30 minutos antes" — precisão de horas não serve.
export const config = { schedule: '*/15 * * * *' }

// Fora dessa janela antes do início, o evento nem é considerado — evita varrer
// a agenda inteira toda execução. 27h cobre a véspera (18h da véspera de um
// simulado às 21h = 27h de antecedência) com folga.
const JANELA_ANTECEDENCIA_MS = 27 * 60 * 60 * 1000

const TIPOS_SIMULADO = new Set(['simulado', 'simuladao'])
const ROTULO_TIPO: Record<string, string> = {
  simulado: 'Simulado',
  simuladao: 'Simuladão',
}
const FASES: FaseLembreteSimulado[] = ['vespera', '30min']

type EventoCalendario = {
  id: string
  date: string
  time: string
  type: string
  title: string
}

type AlunoConhecido = {
  email?: string
  name?: string
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

function chaveLembrete(eventoId: string, email: string, fase: FaseLembreteSimulado) {
  // E-mail em minúsculo na chave pra não gerar dois registros do mesmo aluno
  // por diferença de caixa.
  return `${eventoId}__${email.toLowerCase()}__${fase}`
}

export default async function handler() {
  const agora = new Date()
  const agoraMs = agora.getTime()

  const [eventos, alunos] = await Promise.all([
    lerJson<EventoCalendario>(STORES.eventosCalendario),
    // Mesma fonte usada pra avisar sobre material novo: só alcança quem já
    // logou pelo menos uma vez (a aprovação de conta é feita no Netlify
    // Identity, fora do código). Um aluno recém-aprovado que ainda não entrou
    // recebe a partir do primeiro login.
    lerJson<AlunoConhecido>('session-history'),
  ])

  const simulados = eventos
    .map((e) => e.valor)
    .filter((e) => TIPOS_SIMULADO.has(e.type))
    .filter((e) => {
      const inicioMs = instanteInicioSimulado(e.date, e.time)
      return inicioMs > agoraMs && inicioMs - agoraMs <= JANELA_ANTECEDENCIA_MS
    })

  const destinatarios = alunos
    .map((a) => a.valor)
    .filter((a): a is Required<AlunoConhecido> => Boolean(a.email))

  const store = getStore({ name: STORES.lembretesSimulado, consistency: 'strong' })
  let enviados = 0
  let jaEnviados = 0
  let semChave = 0
  const erros: string[] = []

  for (const evento of simulados) {
    for (const fase of FASES) {
      if (!deveEnviarLembreteSimulado(fase, evento.date, evento.time, agora)) continue

      for (const aluno of destinatarios) {
        const chave = chaveLembrete(evento.id, aluno.email, fase)

        // Idempotência atômica: reserva a chave ANTES de enviar, com onlyIfNew.
        // Se já existe (aluno já recebeu, ou outra execução concorrente acabou
        // de reservar), pula.
        const claim = await store.setJSON(
          chave,
          { chave, eventoId: evento.id, email: aluno.email, fase, enviadoEm: agora.toISOString() },
          { onlyIfNew: true },
        )
        if (!claim?.modified) {
          jaEnviados += 1
          continue
        }

        const { assunto, html, texto } = montarEmailLembreteSimulado({
          nomeAluno: aluno.name || 'Aluno(a)',
          tipo: ROTULO_TIPO[evento.type] ?? 'Simulado',
          titulo: evento.title,
          data: evento.date,
          hora: evento.time,
          fase,
        })

        const resultado = await enviarEmail({ para: aluno.email, assunto, html, texto })

        if (resultado.status === 'nao-configurado') {
          // Sem RESEND_API_KEY o e-mail não saiu: libera a chave reservada pra
          // que o lembrete saia numa execução seguinte, quando a chave existir.
          await store.delete(chave)
          semChave += 1
          continue
        }

        if (resultado.status === 'erro') {
          await store.delete(chave)
          erros.push(`${aluno.email} (${evento.id}/${fase}): ${resultado.motivo}`)
          continue
        }

        enviados += 1
      }
    }
  }

  const resumo = { simulados: simulados.length, destinatarios: destinatarios.length, enviados, jaEnviados, semChave, erros }
  console.log('[lembrete-simulado]', JSON.stringify(resumo))

  if (semChave > 0) {
    console.warn('[lembrete-simulado] RESEND_API_KEY não configurada — nenhum e-mail enviado.')
  }
  for (const erro of erros) console.error('[lembrete-simulado] falha no envio —', erro)

  return new Response(JSON.stringify(resumo), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}
