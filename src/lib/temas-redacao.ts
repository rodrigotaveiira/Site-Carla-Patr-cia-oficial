import { createServerFn } from '@tanstack/react-start'
import { getStore } from '@netlify/blobs'
import { getServerUser } from './auth'
import { isStaff, userHasRole } from './roles'

export type TemaRedacao = {
  id: string
  title: string
  proposta: string
  prazo: string | null // data limite de entrega (YYYY-MM-DD), opcional
  createdAt: string
}

function temasStore() {
  return getStore({ name: 'redacao-temas', consistency: 'strong' })
}

// Qualquer aluno logado vê os temas propostos.
export const listTemas = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await getServerUser()
  if (!user || (!userHasRole(user, 'aprovado') && !isStaff(user))) throw new Error('Acesso negado.')

  const store = temasStore()
  const { blobs } = await store.list()
  const temas: TemaRedacao[] = []
  for (const blob of blobs) {
    const value = await store.get(blob.key, { type: 'json' })
    if (value) temas.push(value as TemaRedacao)
  }
  temas.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return temas
})

export const addTema = createServerFn({ method: 'POST' })
  .inputValidator((data: { title: string; proposta: string; prazo?: string }) => data)
  .handler(async ({ data }) => {
    const user = await getServerUser()
    if (!user || !isStaff(user)) throw new Error('Acesso negado.')
    if (!data.title.trim()) throw new Error('Dê um título para o tema.')

    const store = temasStore()
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const tema: TemaRedacao = {
      id,
      title: data.title.trim(),
      proposta: data.proposta.trim(),
      prazo: data.prazo?.trim() || null,
      createdAt: new Date().toISOString(),
    }
    await store.setJSON(id, tema)
    return tema
  })

export const deleteTema = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const user = await getServerUser()
    if (!user || !isStaff(user)) throw new Error('Acesso negado.')
    const store = temasStore()
    await store.delete(data.id)
    return { ok: true }
  })