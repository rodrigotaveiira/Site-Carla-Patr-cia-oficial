import { createServerFn } from '@tanstack/react-start'
import { getStore } from '@netlify/blobs'
import { z } from 'zod'
import { getServerUser } from './auth'
import { userHasRole } from './roles'
import { boundedText } from './schemas'

export type LiveClass = {
  title: string
  module: string
  description: string
  dateTime: string // datetime local, formato "YYYY-MM-DDTHH:mm" (horário de Brasília, sem conversão)
  durationMinutes: number
  zoomLink: string
  updatedAt: string
}

function liveClassStore() {
  return getStore({ name: 'live-class', consistency: 'strong' })
}

// Qualquer aluno logado vê a próxima aula ao vivo configurada (ou null, se nada foi agendado ainda).
export const getLiveClass = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await getServerUser()
  if (!user || (!userHasRole(user, 'aprovado') && !userHasRole(user, 'admin'))) {
    throw new Error('Acesso negado.')
  }
  const store = liveClassStore()
  const value = await store.get('current', { type: 'json' })
  return (value as LiveClass | null) ?? null
})

export const updateLiveClass = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      title: boundedText(200),
      module: z.string().trim().max(120),
      description: z.string().trim().max(5000),
      dateTime: z.string().regex(/^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/, 'Data e horário inválidos.'),
      durationMinutes: z.coerce.number().int().min(5).max(600),
      zoomLink: z
        .union([z.url().refine((v) => /^https?:\/\//i.test(v), 'O link do Zoom não parece válido.'), z.literal('')])
        .transform((v) => v ?? ''),
    }),
  )
  .handler(async ({ data }) => {
    const user = await getServerUser()
    if (!user || !userHasRole(user, 'admin')) throw new Error('Acesso negado.')

    const store = liveClassStore()
    const liveClass: LiveClass = {
      title: data.title.trim(),
      module: data.module.trim() || 'Aula ao vivo',
      description: data.description.trim(),
      dateTime: data.dateTime,
      durationMinutes: Number(data.durationMinutes) || 60,
      zoomLink: data.zoomLink.trim(),
      updatedAt: new Date().toISOString(),
    }
    await store.setJSON('current', liveClass)
    return liveClass
  })
