import { createServerFn } from '@tanstack/react-start'
import { getStore } from '@netlify/blobs'
import { getServerUser } from './auth'
import { userHasRole } from './roles'

function watchStore() {
  return getStore({ name: 'lesson-watch-progress', consistency: 'strong' })
}

async function requireStudent() {
  const user = await getServerUser()
  if (!user || (!userHasRole(user, 'aprovado') && !userHasRole(user, 'admin'))) {
    throw new Error('Acesso negado.')
  }
  return user
}

// Marca uma aula como assistida pelo aluno logado (chamado quando ele abre a aula pra assistir).
export const markLessonWatched = createServerFn({ method: 'POST' })
  .inputValidator((data: { lessonId: string }) => data)
  .handler(async ({ data }) => {
    const user = await requireStudent()
    if (!user.email) return { watched: [] }

    const store = watchStore()
    const existing = (await store.get(user.email, { type: 'json' })) as string[] | null
    const watched = new Set(existing ?? [])
    watched.add(data.lessonId)
    const list = Array.from(watched)
    await store.setJSON(user.email, list)
    return { watched: list }
  })

// Lista os ids das aulas que o aluno logado já assistiu.
export const getMyWatchedLessons = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await requireStudent()
  if (!user.email) return []
  const store = watchStore()
  const existing = (await store.get(user.email, { type: 'json' })) as string[] | null
  return existing ?? []
})
