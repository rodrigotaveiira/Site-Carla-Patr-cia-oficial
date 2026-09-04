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
  const erros: string[] = []

  for (const alvo of pendentes) {
    const chave = chaveLembrete(alvo.slotId, alvo.email)

    // Idempotência: se já existe registro, esse aluno já recebeu o lembrete
    // desta mentoria. Sem isso, a execução de hora em hora reenviaria sempre.
    const existente = (await store.get(chave, { type: 'json' })) as RegistroLembrete | null
    if (existente) {
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

    const resultado = await enviarEmail({ para: alvo.email, assunto, html, texto })

    if (resultado.status === 'nao-configurado') {
      // Sem RESEND_API_KEY não grava registro nenhum: quando a chave for
      // configurada, os lembretes pendentes saem na execução seguinte em vez
      // de terem sido perdidos silenciosamente.
      semChave += 1
      continue
    }

    if (resultado.status === 'erro') {
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
    await store.setJSON(chave, registro)
    // Índice por token, pra tela de confirmação achar o registro sem varrer tudo.
    await store.setJSON(`token__${token}`, registro)
    enviados += 1
  }

  const resumo = { pendentes: pendentes.length, enviados, jaEnviados, semChave, erros }
  console.log('[lembrete-mentoria]', JSON.stringify(resumo))

  if (semChave > 0) {
    console.warn('[lembrete-mentoria] RESEND_API_KEY não configurada — nenhum e-mail enviado.')
  }
  for (const erro of erros) console.error('[lembrete-mentoria] falha no envio —', erro)

  return new Response(JSON.stringify(resumo), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}
