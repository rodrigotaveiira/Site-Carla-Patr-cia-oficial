import { createServerFn } from '@tanstack/react-start'
import { getStore } from '@netlify/blobs'
import { z } from 'zod'
import { getServerUser } from './auth'
import { userHasRole } from './roles'
import { STORES } from './blob-stores'
import { boundedText, hhmm, id as idSchema, isoDate } from './schemas'

const calendarEventInput = z.object({
  date: isoDate,
  time: hhmm,
  type: z.string().trim().min(1).max(50),
  title: boundedText(300),
  link: z.string().trim().max(2000),
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

export type CalendarEvent = {
  id: string
  date: string // formato 'AAAA-MM-DD'
  time: string // formato 'HH:MM', ou '' quando o evento não tem hora marcada
  type: CalendarEventType
  title: string
  link: string // opcional: Zoom da aula ao vivo, material de apoio, etc.
  createdAt: string
}

function eventsStore() {
  return getStore({ name: STORES.eventosCalendario, consistency: 'strong' })
}

function isValidType(value: unknown): value is CalendarEventType {
  return CALENDAR_EVENT_TYPES.includes(value as CalendarEventType)
}

// 'AAAA-MM-DD' — barra data escrita errada antes de gravar no store.
function isValidDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

// 'HH:MM' ou vazio (evento do dia inteiro).
function isValidTime(value: string) {
  return value === '' || /^\d{2}:\d{2}$/.test(value)
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
    if (value) events.push(value as CalendarEvent)
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

    const event: CalendarEvent = {
      id: makeId(),
      date: data.date,
      time: data.time,
      type: data.type,
      title: data.title,
      link: data.link,
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

    const updated: CalendarEvent = {
      ...existing,
      date: data.date,
      time: data.time,
      type: data.type,
      title: data.title,
      link: data.link,
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
