import { createServerFn } from '@tanstack/react-start'
import { getStore } from '@netlify/blobs'
import { z } from 'zod'
import { getServerUser } from './auth'
import { userHasRole, isStaff } from './roles'
import { assertActiveSession } from './session-guard.server'
import { enforceRateLimit } from './rate-limit'
import { boundedText, id as idSchema } from './schemas'

export type Recado = {
  id: string
  studentEmail: string
  studentName: string
  message: string
  createdAt: string
  read: boolean
  reply: string | null
  repliedAt: string | null
}

function recadosStore() {
  return getStore({ name: 'student-recados', consistency: 'strong' })
}

function studentDisplayName(user: unknown) {
  const u = user as Record<string, any>
  return u?.name || u?.user_metadata?.full_name || u?.userMetadata?.full_name || 'Aluno'
}

const RECADO_RATE_LIMIT = { action: 'recado', windowMs: 24 * 60 * 60 * 1000, max: 10 } as const

export const sendRecado = createServerFn({ method: 'POST' })
  .validator(z.object({ message: boundedText(2000) }))
  .handler(async ({ data }) => {
    const user = await getServerUser()
    if (!user || (!userHasRole(user, 'aprovado') && !userHasRole(user, 'admin'))) {
      throw new Error('Acesso negado.')
    }
    await assertActiveSession(user)
    await enforceRateLimit(RECADO_RATE_LIMIT, user.email ?? '')

    const store = recadosStore()
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const recado: Recado = {
      id,
      studentEmail: user.email ?? '',
      studentName: studentDisplayName(user),
      message: data.message,
      createdAt: new Date().toISOString(),
      read: false,
      reply: null,
      repliedAt: null,
    }
    await store.setJSON(id, recado)
    return recado
  })

export const listMyRecados = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await getServerUser()
  if (!user) throw new Error('Você precisa estar logado.')

  const store = recadosStore()
  const { blobs } = await store.list()
  const mine: Recado[] = []
  for (const blob of blobs) {
    const value = await store.get(blob.key, { type: 'json' })
    if (value && (value as Recado).studentEmail === user.email) mine.push(value as Recado)
  }
  mine.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return mine
})

export const listAllRecados = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await getServerUser()
  if (!user || !isStaff(user)) throw new Error('Acesso negado.')

  const store = recadosStore()
  const { blobs } = await store.list()
  const all: Recado[] = []
  for (const blob of blobs) {
    const value = await store.get(blob.key, { type: 'json' })
    if (value) all.push(value as Recado)
  }
  all.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return all
})

export const markRecadoRead = createServerFn({ method: 'POST' })
  .validator(z.object({ id: idSchema }))
  .handler(async ({ data }) => {
    const user = await getServerUser()
    if (!user || !isStaff(user)) throw new Error('Acesso negado.')

    const store = recadosStore()
    const existing = await store.get(data.id, { type: 'json' }) as Recado | null
    if (!existing) throw new Error('Recado não encontrado.')

    await store.setJSON(data.id, { ...existing, read: true })
    return { ok: true }
  })

// Recado deixa de ser via só de mão única — a professora responde e o aluno
// vê a resposta na página dele. Responder já marca como lido (não faz sentido
// responder sem ter lido).
export const replyRecado = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: string; reply: string }) => data)
  .handler(async ({ data }) => {
    const user = await getServerUser()
    if (!user || !isStaff(user)) throw new Error('Acesso negado.')
    if (!data.reply.trim()) throw new Error('Escreva uma resposta antes de enviar.')
    if (data.reply.length > 2000) throw new Error('Resposta muito longa (máximo 2000 caracteres).')

    const store = recadosStore()
    const existing = await store.get(data.id, { type: 'json' }) as Recado | null
    if (!existing) throw new Error('Recado não encontrado.')

    const updated: Recado = {
      ...existing,
      read: true,
      reply: data.reply.trim(),
      repliedAt: new Date().toISOString(),
    }
    await store.setJSON(data.id, updated)
    return updated
  })
