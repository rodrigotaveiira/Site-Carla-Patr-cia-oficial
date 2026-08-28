import { createServerFn } from '@tanstack/react-start'
import { getStore } from '@netlify/blobs'
import { getServerUser } from './auth'
import { userHasRole } from './roles'
import { CONTENT_SECTIONS, type ContentSection } from './content-library'

export type ContentCounts = {
  aulas: number
  materiais: number
  bibliotecas: Record<ContentSection, number>
  totalArquivos: number
}

async function countBlobs(storeName: string) {
  const store = getStore({ name: storeName, consistency: 'strong' })
  const { blobs } = await store.list()
  return blobs.length
}

// Conta quantas aulas, materiais e arquivos (PDF/Word) existem hoje na plataforma,
// pra alimentar a área "Meu progresso" com números reais em vez de fixos.
export const getContentCounts = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await getServerUser()
  if (!user || (!userHasRole(user, 'aprovado') && !userHasRole(user, 'admin'))) {
    throw new Error('Acesso negado.')
  }

  const [aulas, materiais] = await Promise.all([
    countBlobs('lessons'),
    countBlobs('student-materials'),
  ])

  const sectionKeys = Object.keys(CONTENT_SECTIONS) as ContentSection[]
  const sectionCounts = await Promise.all(
    sectionKeys.map((section) => countBlobs(`content-library-${section}`)),
  )

  const bibliotecas = Object.fromEntries(
    sectionKeys.map((section, index) => [section, sectionCounts[index]]),
  ) as Record<ContentSection, number>

  const totalArquivos = materiais + sectionCounts.reduce((sum, count) => sum + count, 0)

  const result: ContentCounts = { aulas, materiais, bibliotecas, totalArquivos }
  return result
})

export type StudentProgress = {
  overallPercent: number
  aulasAssistidas: number
  aulasDisponiveis: number
  aulasPercent: number
  redacoesEntregues: number
  redacoesPercent: number
}

// Meta de engajamento usada só para calcular a fatia de "redações" do progresso geral:
// entregar 5 redações conta como 100% nessa fatia. É um número de referência, não uma
// quantidade mínima obrigatória — pode ser ajustado aqui se fizer sentido mudar.
export const REDACOES_META_PROGRESSO = 5

// Calcula o "progresso geral" do aluno logado, combinando aulas assistidas e redações entregues.
export const getStudentProgress = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await getServerUser()
  if (!user || (!userHasRole(user, 'aprovado') && !userHasRole(user, 'admin'))) {
    throw new Error('Acesso negado.')
  }

  const totalLessons = await countBlobs('lessons')

  const watchStore = getStore({ name: 'lesson-watch-progress', consistency: 'strong' })
  const watchedList = user.email
    ? ((await watchStore.get(user.email, { type: 'json' })) as string[] | null) ?? []
    : []
  const watchedCount = watchedList.length

  const redacoesStore = getStore({ name: 'redacoes-submissions', consistency: 'strong' })
  const { blobs } = await redacoesStore.list()
  let redacoesEntregues = 0
  for (const blob of blobs) {
    const value = (await redacoesStore.get(blob.key, { type: 'json' })) as { studentEmail?: string } | null
    if (value?.studentEmail === user.email) redacoesEntregues += 1
  }

  const aulasPercent = totalLessons > 0 ? Math.min(100, (watchedCount / totalLessons) * 100) : 0
  const redacoesPercent = Math.min(100, (redacoesEntregues / REDACOES_META_PROGRESSO) * 100)
  const overallPercent = Math.round((aulasPercent + redacoesPercent) / 2)

  const result: StudentProgress = {
    overallPercent,
    aulasAssistidas: watchedCount,
    aulasDisponiveis: totalLessons,
    aulasPercent: Math.round(aulasPercent),
    redacoesEntregues,
    redacoesPercent: Math.round(redacoesPercent),
  }
  return result
})
