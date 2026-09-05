import { createServerFn } from '@tanstack/react-start'
import { getStore } from '@netlify/blobs'
import { z } from 'zod'
import { getServerUser } from './auth'
import { userHasRole, isStaff } from './roles'
import { assertActiveSession } from './session-guard.server'
import { enforceRateLimit } from './rate-limit'
import { validateUpload } from './upload-validation'
import { competencyScore, dataUrl, fileName as fileNameSchema, id as idSchema, optionalText } from './schemas'
import type { Competency } from './competencies'

export type CompetencyScore = Competency & { value: number }

export type RedacaoSubmission = {
  id: string
  studentEmail: string
  studentName: string
  title: string
  deliveryMethod: 'upload' | 'presencial'
  fileName: string
  fileDataUrl: string
  submittedAt: string
  status: 'pendente' | 'corrigida'
  grade: number | null
  competencyScores: CompetencyScore[] | null
  feedback: string | null
  correctedAt: string | null
  correctedFileName: string | null
  correctedFileDataUrl: string | null
}

const MAX_FILE_DATA_URL_LENGTH = 10_000_000
const MAX_DECODED_BYTES = 8 * 1024 * 1024 // 8MB de arquivo de verdade (depois do base64)
const REDACAO_ALLOWED = ['image', 'pdf', 'docx', 'doc'] as const
const REDACAO_RATE_LIMIT = { action: 'redacao', windowMs: 24 * 60 * 60 * 1000, max: 6 } as const

function redacoesStore() {
  return getStore({ name: 'redacoes-submissions', consistency: 'strong' })
}

function studentDisplayName(user: unknown) {
  const u = user as Record<string, any>
  return u?.name || u?.user_metadata?.full_name || u?.userMetadata?.full_name || 'Aluno'
}

export const submitRedacao = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      title: optionalText(300),
      fileName: fileNameSchema,
      fileDataUrl: dataUrl(MAX_FILE_DATA_URL_LENGTH),
    }),
  )
  .handler(async ({ data }) => {
    const user = await getServerUser()
    if (!user || (!userHasRole(user, 'aprovado') && !userHasRole(user, 'admin'))) {
      throw new Error('Acesso negado.')
    }
    await assertActiveSession(user)
    await enforceRateLimit(REDACAO_RATE_LIMIT, user.email ?? '')

    // Valida pelo CONTEÚDO: base64 íntegro, tamanho real, assinatura de bytes
    // batendo com a extensão, e (pra .docx) o zip não sendo uma bomba.
    validateUpload({
      dataUrl: data.fileDataUrl,
      fileName: data.fileName,
      allowed: [...REDACAO_ALLOWED],
      maxDecodedBytes: MAX_DECODED_BYTES,
    })

    const store = redacoesStore()
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const submission: RedacaoSubmission = {
      id,
      studentEmail: user.email ?? '',
      studentName: studentDisplayName(user),
      title: (data.title ?? '') || 'Redação sem título',
      deliveryMethod: 'upload',
      fileName: data.fileName,
      fileDataUrl: data.fileDataUrl,
      submittedAt: new Date().toISOString(),
      status: 'pendente',
      grade: null,
      competencyScores: null,
      feedback: null,
      correctedAt: null,
      correctedFileName: null,
      correctedFileDataUrl: null,
    }
    await store.setJSON(id, submission)
    const { fileDataUrl: _omit, ...meta } = submission
    return meta
  })

// Aluno que escreveu a redação no papel, em sala, e não tem arquivo pra enviar —
// só confirma a entrega presencial e a redação entra na fila de correção mesmo assim.
export const submitRedacaoPresencial = createServerFn({ method: 'POST' })
  .validator(z.object({ title: optionalText(300) }))
  .handler(async ({ data }) => {
    const user = await getServerUser()
    if (!user || (!userHasRole(user, 'aprovado') && !userHasRole(user, 'admin'))) {
      throw new Error('Acesso negado.')
    }
    await assertActiveSession(user)
    await enforceRateLimit(REDACAO_RATE_LIMIT, user.email ?? '')

    const store = redacoesStore()
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const submission: RedacaoSubmission = {
      id,
      studentEmail: user.email ?? '',
      studentName: studentDisplayName(user),
      title: (data.title ?? '') || 'Redação sem título',
      deliveryMethod: 'presencial',
      fileName: '',
      fileDataUrl: '',
      submittedAt: new Date().toISOString(),
      status: 'pendente',
      grade: null,
      competencyScores: null,
      feedback: null,
      correctedAt: null,
      correctedFileName: null,
      correctedFileDataUrl: null,
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
  const mine: Omit<RedacaoSubmission, 'fileDataUrl' | 'correctedFileDataUrl'>[] = []
  for (const blob of blobs) {
    const value = await store.get(blob.key, { type: 'json' })
    if (value && (value as RedacaoSubmission).studentEmail === user.email) {
      const { fileDataUrl: _omit, correctedFileDataUrl: _omit2, ...meta } = value as RedacaoSubmission
      mine.push(meta)
    }
  }
  mine.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
  return mine
})

export const listAllRedacoes = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await getServerUser()
  if (!user || !isStaff(user)) throw new Error('Acesso negado.')

  const store = redacoesStore()
  const { blobs } = await store.list()
  const all: Omit<RedacaoSubmission, 'fileDataUrl' | 'correctedFileDataUrl'>[] = []
  for (const blob of blobs) {
    const value = await store.get(blob.key, { type: 'json' })
    if (value) {
      const { fileDataUrl: _omit, correctedFileDataUrl: _omit2, ...meta } = value as RedacaoSubmission
      all.push(meta)
    }
  }
  all.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
  return all
})

export const getRedacaoFile = createServerFn({ method: 'GET' })
  .validator(z.object({ id: idSchema, kind: z.enum(['original', 'correction']).optional() }))
  .handler(async ({ data }) => {
    const user = await getServerUser()
    if (!user) throw new Error('Você precisa estar logado.')

    const store = redacoesStore()
    const submission = await store.get(data.id, { type: 'json' }) as RedacaoSubmission | null
    if (!submission) throw new Error('Redação não encontrada.')

    const isOwner = submission.studentEmail === user.email
    if (!isOwner && !isStaff(user)) throw new Error('Acesso negado.')

    if (data.kind === 'correction') {
      if (!submission.correctedFileDataUrl) throw new Error('Essa correção não tem foto anexada.')
      return { fileName: submission.correctedFileName ?? 'correcao', fileDataUrl: submission.correctedFileDataUrl }
    }

    if (submission.deliveryMethod === 'presencial') throw new Error('Essa redação foi entregue presencialmente, não há arquivo.')
    return { fileName: submission.fileName, fileDataUrl: submission.fileDataUrl }
  })

export const correctRedacao = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      id: idSchema,
      scores: z.array(competencyScore).min(1),
      feedback: z.string().max(20000),
      correctionFileName: fileNameSchema.optional(),
      correctionFileDataUrl: dataUrl(MAX_FILE_DATA_URL_LENGTH).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const user = await getServerUser()
    if (!user || !isStaff(user)) throw new Error('Acesso negado.')

    for (const score of data.scores) {
      if (score.value < 0 || score.value > score.maxValue) {
        throw new Error(`A nota de "${score.label}" deve estar entre 0 e ${score.maxValue}.`)
      }
    }

    if (data.correctionFileDataUrl) {
      if (!data.correctionFileName) throw new Error('Arquivo de correção inválido.')
      validateUpload({
        dataUrl: data.correctionFileDataUrl,
        fileName: data.correctionFileName,
        allowed: [...REDACAO_ALLOWED],
        maxDecodedBytes: MAX_DECODED_BYTES,
      })
    }

    const store = redacoesStore()
    const submission = await store.get(data.id, { type: 'json' }) as RedacaoSubmission | null
    if (!submission) throw new Error('Redação não encontrada.')

    // A banca Econ Rio usa nota bruta de 0 a 10 (soma das competências) e aplica peso 4,
    // resultando na nota final de até 40 pontos.
    const GRADE_WEIGHT = 4
    const rawGrade = data.scores.reduce((sum, s) => sum + s.value, 0)
    const grade = Math.round(rawGrade * GRADE_WEIGHT * 100) / 100
    // Guarda só o essencial no histórico (sem a lista de níveis, que é só texto de apoio pra correção).
    const cleanScores = data.scores.map(({ id, label, maxValue, value }) => ({ id, label, maxValue, value }))

    const updated: RedacaoSubmission = {
      ...submission,
      status: 'corrigida',
      grade,
      competencyScores: cleanScores,
      feedback: data.feedback.trim(),
      correctedAt: new Date().toISOString(),
      // Se a professora não anexou uma foto nova nesta edição, mantém a que já existia.
      correctedFileName: data.correctionFileDataUrl ? data.correctionFileName! : submission.correctedFileName,
      correctedFileDataUrl: data.correctionFileDataUrl ?? submission.correctedFileDataUrl,
    }
    await store.setJSON(data.id, updated)
    const { fileDataUrl: _omit, correctedFileDataUrl: _omit2, ...meta } = updated
    return meta
  })
