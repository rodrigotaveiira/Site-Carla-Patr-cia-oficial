import { createServerFn } from '@tanstack/react-start'
import { getStore } from '@netlify/blobs'
import { getServerUser } from './auth'
import { userHasRole } from './roles'

export type RedacaoSubmission = {
  id: string
  studentEmail: string
  studentName: string
  title: string
  fileName: string
  fileDataUrl: string
  submittedAt: string
  status: 'pendente' | 'corrigida'
  grade: number | null
  feedback: string | null
  correctedAt: string | null
}

const MAX_FILE_DATA_URL_LENGTH = 10_000_000
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.pdf', '.doc', '.docx']

function redacoesStore() {
  return getStore({ name: 'redacoes-submissions', consistency: 'strong' })
}

function studentDisplayName(user: unknown) {
  const u = user as Record<string, any>
  return u?.name || u?.user_metadata?.full_name || u?.userMetadata?.full_name || 'Aluno'
}

export const submitRedacao = createServerFn({ method: 'POST' })
  .inputValidator((data: { title: string; fileName: string; fileDataUrl: string }) => data)
  .handler(async ({ data }) => {
    const user = await getServerUser()
    if (!user || (!userHasRole(user, 'aprovado') && !userHasRole(user, 'admin'))) {
      throw new Error('Acesso negado.')
    }
    if (!data.fileDataUrl || !data.fileName) throw new Error('Escolha um arquivo ou foto da redação.')

    const extension = data.fileName.toLowerCase().slice(data.fileName.lastIndexOf('.'))
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      throw new Error('Envie uma foto (JPG, PNG, WEBP) ou um arquivo (PDF, DOC, DOCX).')
    }
    if (data.fileDataUrl.length > MAX_FILE_DATA_URL_LENGTH) {
      throw new Error('Esse arquivo é muito grande. Envie um arquivo de até 8MB.')
    }

    const store = redacoesStore()
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const submission: RedacaoSubmission = {
      id,
      studentEmail: user.email ?? '',
      studentName: studentDisplayName(user),
      title: data.title.trim() || 'Redação sem título',
      fileName: data.fileName,
      fileDataUrl: data.fileDataUrl,
      submittedAt: new Date().toISOString(),
      status: 'pendente',
      grade: null,
      feedback: null,
      correctedAt: null,
    }
    await store.setJSON(id, submission)
    const { fileDataUrl: _omit, ...meta } = submission
    return meta
  })

export const listMyRedacoes = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await getServerUser()
  if (!user || (!userHasRole(user, 'aprovado') && !userHasRole(user, 'admin'))) {
    throw new Error('Acesso negado.')
  }
  const store = redacoesStore()
  const { blobs } = await store.list()
  const mine: Omit<RedacaoSubmission, 'fileDataUrl'>[] = []
  for (const blob of blobs) {
    const value = await store.get(blob.key, { type: 'json' })
    if (value && (value as RedacaoSubmission).studentEmail === user.email) {
      const { fileDataUrl: _omit, ...meta } = value as RedacaoSubmission
      mine.push(meta)
    }
  }
  mine.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
  return mine
})

export const listAllRedacoes = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await getServerUser()
  if (!user || !userHasRole(user, 'admin')) throw new Error('Acesso negado.')

  const store = redacoesStore()
  const { blobs } = await store.list()
  const all: Omit<RedacaoSubmission, 'fileDataUrl'>[] = []
  for (const blob of blobs) {
    const value = await store.get(blob.key, { type: 'json' })
    if (value) {
      const { fileDataUrl: _omit, ...meta } = value as RedacaoSubmission
      all.push(meta)
    }
  }
  all.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
  return all
})

export const getRedacaoFile = createServerFn({ method: 'GET' })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const user = await getServerUser()
    if (!user) throw new Error('Você precisa estar logado.')

    const store = redacoesStore()
    const submission = await store.get(data.id, { type: 'json' }) as RedacaoSubmission | null
    if (!submission) throw new Error('Redação não encontrada.')

    const isOwner = submission.studentEmail === user.email
    if (!isOwner && !userHasRole(user, 'admin')) throw new Error('Acesso negado.')

    return { fileName: submission.fileName, fileDataUrl: submission.fileDataUrl }
  })

export const correctRedacao = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: string; grade: number; feedback: string }) => data)
  .handler(async ({ data }) => {
    const user = await getServerUser()
    if (!user || !userHasRole(user, 'admin')) throw new Error('Acesso negado.')
    if (data.grade < 0 || data.grade > 1000) throw new Error('A nota deve estar entre 0 e 1000.')

    const store = redacoesStore()
    const submission = await store.get(data.id, { type: 'json' }) as RedacaoSubmission | null
    if (!submission) throw new Error('Redação não encontrada.')

    const updated: RedacaoSubmission = {
      ...submission,
      status: 'corrigida',
      grade: data.grade,
      feedback: data.feedback.trim(),
      correctedAt: new Date().toISOString(),
    }
    await store.setJSON(data.id, updated)
    const { fileDataUrl: _omit, ...meta } = updated
    return meta
  })
