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
