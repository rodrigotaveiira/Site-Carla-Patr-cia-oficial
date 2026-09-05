import { createServerFn } from '@tanstack/react-start'
import { boundedText, id as idSchema } from './schemas'
import { z } from 'zod'
import { getStore } from '@netlify/blobs'
import { getServerUser } from './auth'
import { isStaff, userHasRole } from './roles'

export type Lembrete = {
  id: string
  message: string
  authorName: string
  createdAt: string
}

function lembretesStore() {
  return getStore({ name: 'student-reminders', consistency: 'strong' })
}

// Qualquer aluno logado vê os lembretes mais recentes.
export const listLembretes = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await getServerUser()
  if (!user || (!userHasRole(user, 'aprovado') && !isStaff(user))) throw new Error('Acesso negado.')

  const store = lembretesStore()
  const { blobs } = await store.list()
  const lembretes: Lembrete[] = []
  for (const blob of blobs) {
    const value = await store.get(blob.key, { type: 'json' })
    if (value) lembretes.push(value as Lembrete)
  }
  lembretes.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return lembretes.slice(0, 10)
})

export const createLembrete = createServerFn({ method: 'POST' })
  .validator(z.object({ message: boundedText(5000) }))
  .handler(async ({ data }) => {
    const user = await getServerUser()
    if (!user || !isStaff(user)) throw new Error('Acesso negado.')
    if (!data.message.trim()) throw new Error('Escreva o texto do lembrete.')

    const authorName =
      (user as any).name ||
      (user as any).user_metadata?.full_name ||
      (user as any).userMetadata?.full_name ||
      'Professor(a)'

    const store = lembretesStore()
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const lembrete: Lembrete = {
      id,
      message: data.message.trim(),
      authorName,
      createdAt: new Date().toISOString(),
    }
    await store.setJSON(id, lembrete)
    return lembrete
  })

export const deleteLembrete = createServerFn({ method: 'POST' })
  .validator(z.object({ id: idSchema }))
  .handler(async ({ data }) => {
    const user = await getServerUser()
    if (!user || !isStaff(user)) throw new Error('Acesso negado.')
    const store = lembretesStore()
    await store.delete(data.id)
    return { ok: true }
  })
