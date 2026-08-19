import { createServerFn } from '@tanstack/react-start'
import { getStore } from '@netlify/blobs'
import { getServerUser } from './auth'
import { userHasRole } from './roles'

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
  .inputValidator((data: {
    title: string
    module: string
    description: string
    dateTime: string
    durationMinutes: number
    zoomLink: string
  }) => data)
  .handler(async ({ data }) => {
    const user = await getServerUser()
    if (!user || !userHasRole(user, 'admin')) throw new Error('Acesso negado.')
    if (!data.title.trim()) throw new Error('Dê um título para a aula.')
    if (!data.dateTime) throw new Error('Escolha a data e o horário da aula.')

    if (data.zoomLink.trim()) {
      try {
        new URL(data.zoomLink.trim())
      } catch {
        throw new Error('O link do Zoom não parece válido.')
      }
    }

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
