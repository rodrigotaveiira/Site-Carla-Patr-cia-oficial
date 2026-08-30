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

// Um módulo é só uma etiqueta com nome + ordem — as aulas guardam o nome do
// módulo direto (Lesson.module continua texto), então renomear um módulo
// aqui reescreve o nome em todas as aulas que já usavam o nome antigo (ver
// renameLessonModule). Isso evita ter que migrar o schema das aulas: quem já
// existe continua funcionando, e "agrupar por conteúdo" vira só "escolher
// numa lista", em vez de digitar o nome do módulo toda vez.
export type LessonModule = {
  id: string
  name: string
  order: number
  createdAt: string
}

function lessonsStore() {
  return getStore({ name: 'lessons', consistency: 'strong' })
}

function modulesStore() {
  return getStore({ name: 'lesson-modules', consistency: 'strong' })
}

async function readAllModules(): Promise<LessonModule[]> {
  const store = modulesStore()
  const { blobs } = await store.list()
  const modules: LessonModule[] = []
  for (const blob of blobs) {
    const value = await store.get(blob.key, { type: 'json' })
    if (value) modules.push(value as LessonModule)
  }
  modules.sort((a, b) => a.order - b.order)
  return modules
}

async function readAllLessons(): Promise<Lesson[]> {
  const store = lessonsStore()
  const { blobs } = await store.list()
  const lessons: Lesson[] = []
  for (const blob of blobs) {
    const value = await store.get(blob.key, { type: 'json' })
    if (value) lessons.push(value as Lesson)
  }
  return lessons
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
  const lessons = await readAllLessons()
  lessons.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  return lessons
})

// Lista os módulos cadastrados, em ordem — usado tanto pelo admin (pra montar
// o seletor e a lista "gerenciar módulos") quanto pela tela de aulas do aluno
// (pra agrupar as aulas na mesma ordem que a professora organizou).
export const listLessonModules = createServerFn({ method: 'GET' }).handler(async () => {
  await requireStudent()
  return readAllModules()
})

export const createLessonModule = createServerFn({ method: 'POST' })
  .inputValidator((data: { name: string }) => data)
  .handler(async ({ data }) => {
    await requireAdmin()
    const name = data.name.trim()
    if (!name) throw new Error('Dê um nome para o módulo.')

    const modules = await readAllModules()
    if (modules.some((m) => m.name.toLowerCase() === name.toLowerCase())) {
      throw new Error('Já existe um módulo com esse nome.')
    }

    const store = modulesStore()
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const order = modules.length > 0 ? Math.max(...modules.map((m) => m.order)) + 1 : 0
    const created: LessonModule = { id, name, order, createdAt: new Date().toISOString() }
    await store.setJSON(id, created)
    return created
  })

// Renomeia um módulo e reescreve o nome em todas as aulas que usavam o nome
// antigo — sem isso, renomear "deixaria pra trás" as aulas já cadastradas.
export const renameLessonModule = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: string; name: string }) => data)
  .handler(async ({ data }) => {
    await requireAdmin()
    const name = data.name.trim()
    if (!name) throw new Error('Dê um nome para o módulo.')

    const modules = await readAllModules()
    const current = modules.find((m) => m.id === data.id)
    if (!current) throw new Error('Módulo não encontrado.')
    if (modules.some((m) => m.id !== data.id && m.name.toLowerCase() === name.toLowerCase())) {
      throw new Error('Já existe um módulo com esse nome.')
    }
    if (current.name === name) return current

    const store = modulesStore()
    const updated: LessonModule = { ...current, name }
    await store.setJSON(data.id, updated)

    const lessons = await readAllLessons()
    const lessonsStoreRef = lessonsStore()
    for (const lesson of lessons) {
      if (lesson.module === current.name) {
        await lessonsStoreRef.setJSON(lesson.id, { ...lesson, module: name })
      }
    }

    return updated
  })

// Move um módulo uma posição pra cima ou pra baixo na lista, trocando a
// ordem com o vizinho — mais simples que arrastar-e-soltar e resolve o
// mesmo problema (curar em que sequência os módulos aparecem pro aluno).
export const moveLessonModule = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: string; direction: 'up' | 'down' }) => data)
  .handler(async ({ data }) => {
    await requireAdmin()
    const modules = await readAllModules()
    const index = modules.findIndex((m) => m.id === data.id)
    if (index === -1) throw new Error('Módulo não encontrado.')
    const swapIndex = data.direction === 'up' ? index - 1 : index + 1
    if (swapIndex < 0 || swapIndex >= modules.length) return modules

    const store = modulesStore()
    const current = modules[index]!
    const neighbor = modules[swapIndex]!
    const currentOrder = current.order
    await store.setJSON(current.id, { ...current, order: neighbor.order })
    await store.setJSON(neighbor.id, { ...neighbor, order: currentOrder })

    return readAllModules()
  })

// Só deixa excluir um módulo sem aulas nele — evita que aulas fiquem "órfãs"
// de um módulo que some da lista sem aviso. Pra excluir um módulo em uso,
// primeiro move as aulas dele pra outro módulo.
export const deleteLessonModule = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    await requireAdmin()
    const modules = await readAllModules()
    const current = modules.find((m) => m.id === data.id)
    if (!current) return { ok: true }

    const lessons = await readAllLessons()
    const inUse = lessons.some((lesson) => lesson.module === current.name)
    if (inUse) throw new Error('Esse módulo ainda tem aulas nele. Mova as aulas pra outro módulo antes de excluir.')

    const store = modulesStore()
    await store.delete(data.id)
    return { ok: true }
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

// Edita uma aula já cadastrada — sobretudo pra poder mover uma aula pra outro
// módulo sem precisar excluir e recadastrar (perdendo o link do vídeo, a
// descrição etc). Antes só existia adicionar/excluir.
export const updateLesson = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: string; title: string; module: string; description: string; videoUrl: string }) => data)
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
    const existing = (await store.get(data.id, { type: 'json' })) as Lesson | null
    if (!existing) throw new Error('Aula não encontrada.')

    const updated: Lesson = {
      ...existing,
      title: data.title.trim(),
      module: data.module.trim() || 'Módulo único',
      description: data.description.trim(),
      videoUrl: data.videoUrl.trim(),
    }
    await store.setJSON(data.id, updated)
    return updated
  })

export const deleteLesson = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    await requireAdmin()
    const store = lessonsStore()
    await store.delete(data.id)
    return { ok: true }
  })
