import { createServerFn } from '@tanstack/react-start'
import { getStore } from '@netlify/blobs'
import { z } from 'zod'
import { getServerUser } from './auth'
import { userHasRole } from './roles'
import { STORES } from './blob-stores'
import { boundedText, id as idSchema, isoDate, optionalHhmm, optionalIsoDate } from './schemas'

// A correção de um simulado é uma "sub-agenda" dentro do próprio evento: pode
// cair em outro dia, tem seu próprio horário, link (Zoom) e descrição, e gera
// os mesmos lembretes que o simulado. Só simulado/simuladão têm correção.
const correctionInput = z.object({
  date: optionalIsoDate,
  time: optionalHhmm,
  endTime: optionalHhmm,
  link: z.string().trim().max(2000),
  description: z.string().trim().max(2000),
})

const calendarEventInput = z.object({
  date: isoDate,
  time: optionalHhmm,
  endTime: optionalHhmm,
  type: z.string().trim().min(1).max(50),
  title: boundedText(300),
  link: z.string().trim().max(2000),
  correction: correctionInput.nullable(),
})

// Eventos da agenda ficam num store próprio em vez de virarem campo de data
// dentro de Lesson e Simulado. Aula gravada e simulado são *conteúdo*: ficam
// disponíveis pro aluno quando ele quiser, e não deixam de existir quando a
// data passa. O que tem data é o aviso ("dia 14 tem Simuladão"), não o conteúdo.
export const CALENDAR_EVENT_TYPES = ['aula-ao-vivo', 'aula', 'simulado', 'simuladao', 'outro'] as const

export type CalendarEventType = (typeof CALENDAR_EVENT_TYPES)[number]

export const CALENDAR_EVENT_LABELS: Record<CalendarEventType, string> = {
  'aula-ao-vivo': 'Aula ao vivo',
  aula: 'Aula liberada',
  simulado: 'Simulado',
  simuladao: 'Simuladão',
  outro: 'Outro',
}

// Correção do simulado, quando cadastrada. Campos de data/hora seguem o mesmo
// formato do evento; '' quando não informado.
export type CalendarCorrection = {
  date: string // 'AAAA-MM-DD'
  time: string // 'HH:MM' — início
  endTime: string // 'HH:MM' — término
  link: string
  description: string
}

export type CalendarEvent = {
  id: string
  date: string // formato 'AAAA-MM-DD'
  time: string // formato 'HH:MM', ou '' quando o evento não tem hora marcada
  endTime: string // 'HH:MM' de término, ou '' — só simulado/simuladão usam
  type: CalendarEventType
  title: string
  link: string // opcional: Zoom da aula ao vivo, material de apoio, etc.
  correction: CalendarCorrection | null // só simulado/simuladão
  createdAt: string
}

function isSimuladoType(type: string) {
  return type === 'simulado' || type === 'simuladao'
}

// Normaliza os campos de simulado: fim da prova e correção só valem pra
// simulado/simuladão, e a correção só "existe" quando tem data.
function normalizeSimuladoFields(input: z.infer<typeof calendarEventInput>) {
  if (!isSimuladoType(input.type)) {
    return { endTime: '', correction: null }
  }
  const correction: CalendarCorrection | null =
    input.correction && input.correction.date
      ? {
          date: input.correction.date,
          time: input.correction.time,
          endTime: input.correction.endTime,
          link: input.correction.link,
          description: input.correction.description,
        }
      : null
  return { endTime: input.endTime, correction }
}

function eventsStore() {
  return getStore({ name: STORES.eventosCalendario, consistency: 'strong' })
}

function isValidType(value: unknown): value is CalendarEventType {
  return CALENDAR_EVENT_TYPES.includes(value as CalendarEventType)
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

// Precisa de login e conta aprovada: a agenda revela o planejamento do curso
// (quando tem aula ao vivo, quando cai simulado), que é conteúdo de quem pagou.
// Esta função fica exposta como endpoint independente da tela, então a checagem
// tem que estar aqui e não só no `beforeLoad` da rota.
export const listCalendarEvents = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await getServerUser()
  if (!user || (!userHasRole(user, 'aprovado') && !userHasRole(user, 'admin'))) {
    throw new Error('Acesso negado.')
  }

  const store = eventsStore()
  const { blobs } = await store.list()
  const events: CalendarEvent[] = []

  for (const blob of blobs) {
    const value = await store.get(blob.key, { type: 'json' })
    // Eventos antigos não têm `endTime`/`correction` — completa o formato pra
    // que a tela não precise checar `undefined` em todo lugar.
    if (value) {
      const raw = value as Partial<CalendarEvent>
      events.push({ endTime: '', correction: null, ...raw } as CalendarEvent)
    }
  }

  events.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
  return events
})

export const createCalendarEvent = createServerFn({ method: 'POST' })
  .validator(calendarEventInput)
  .handler(async ({ data }) => {
    const user = await getServerUser()
    if (!user || !userHasRole(user, 'admin')) throw new Error('Acesso negado.')

    if (!isValidType(data.type)) throw new Error('Tipo de evento inválido.')

    const { endTime, correction } = normalizeSimuladoFields(data)
    const event: CalendarEvent = {
      id: makeId(),
      date: data.date,
      time: data.time,
      endTime,
      type: data.type,
      title: data.title,
      link: data.link,
      correction,
      createdAt: new Date().toISOString(),
    }

    await eventsStore().setJSON(event.id, event)
    return event
  })

export const updateCalendarEvent = createServerFn({ method: 'POST' })
  .validator(calendarEventInput.extend({ id: idSchema }))
  .handler(async ({ data }) => {
    const user = await getServerUser()
    if (!user || !userHasRole(user, 'admin')) throw new Error('Acesso negado.')

    if (!isValidType(data.type)) throw new Error('Tipo de evento inválido.')

    const store = eventsStore()
    const existing = (await store.get(data.id, { type: 'json' })) as CalendarEvent | null
    if (!existing) throw new Error('Esse evento não existe mais. Atualize a página.')

    const { endTime, correction } = normalizeSimuladoFields(data)
    const updated: CalendarEvent = {
      ...existing,
      date: data.date,
      time: data.time,
      endTime,
      type: data.type,
      title: data.title,
      link: data.link,
      correction,
    }

    await store.setJSON(data.id, updated)
    return updated
  })

export const deleteCalendarEvent = createServerFn({ method: 'POST' })
  .validator(z.object({ id: idSchema }))
  .handler(async ({ data }) => {
    const user = await getServerUser()
    if (!user || !userHasRole(user, 'admin')) throw new Error('Acesso negado.')

    await eventsStore().delete(data.id)
    return { ok: true }
  })
