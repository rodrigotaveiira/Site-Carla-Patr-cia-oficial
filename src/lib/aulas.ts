import { createServerFn } from '@tanstack/react-start'
import { getStore } from '@netlify/blobs'
import { getServerUser } from './auth'
import { userHasRole } from './roles'

export type Lesson = {
  id: string
  title: string
  module: string
  description: string
  videoUrl: string
  createdAt: string
}

function lessonsStore() {
  return getStore({ name: 'lessons', consistency: 'strong' })
}

async function requireAdmin() {
  const user = await getServerUser()
  if (!user || !userHasRole(user, 'admin')) throw new Error('Acesso negado.')
  return user
}

async function requireStudent() {
  const user = await getServerUser()
  if (!user || (!userHasRole(user, 'aprovado') && !userHasRole(user, 'admin'))) {
    throw new Error('Acesso negado.')
  }
  return user
}

export const listLessons = createServerFn({ method: 'GET' }).handler(async () => {
  await requireStudent()
  const store = lessonsStore()
  const { blobs } = await store.list()
  const lessons: Lesson[] = []
  for (const blob of blobs) {
    const value = await store.get(blob.key, { type: 'json' })
    if (value) lessons.push(value as Lesson)
  }
  lessons.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  return lessons
})

export const addLesson = createServerFn({ method: 'POST' })
  .inputValidator((data: { title: string; module: string; description: string; videoUrl: string }) => data)
  .handler(async ({ data }) => {
    await requireAdmin()
    if (!data.title.trim()) throw new Error('Dê um título para a aula.')
    if (!data.videoUrl.trim()) throw new Error('Cole o link do vídeo.')

    let parsedUrl: URL
    try {
      parsedUrl = new URL(data.videoUrl.trim())
    } catch {
      throw new Error('Esse link de vídeo não parece válido.')
    }
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('Esse link de vídeo não parece válido.')
    }

    const store = lessonsStore()
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const lesson: Lesson = {
      id,
      title: data.title.trim(),
      module: data.module.trim() || 'Módulo único',
      description: data.description.trim(),
      videoUrl: data.videoUrl.trim(),
      createdAt: new Date().toISOString(),
    }
    await store.setJSON(id, lesson)
    return lesson
  })

export const deleteLesson = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    await requireAdmin()
    const store = lessonsStore()
    await store.delete(data.id)
    return { ok: true }
  })
