import { createServerFn } from '@tanstack/react-start'
import { getStore } from '@netlify/blobs'
import { z } from 'zod'
import { getServerUser } from './auth'
import { userHasRole, isStaff } from './roles'
import { assertActiveSession } from './session-guard.server'
import { enforceRateLimit } from './rate-limit'
import { boundedText, id as idSchema, optionalHhmm, optionalIsoDate } from './schemas'
import { isReleased } from './simulado-release'
import { parseActivityText, parseGabaritoText, type SimuladoPassage } from './simulado-parser'

const ATTEMPT_RATE_LIMIT = { action: 'simulado-attempt', windowMs: 24 * 60 * 60 * 1000, max: 30 } as const

export type SimuladoOption = { letter: string; text: string }
export type { SimuladoPassage }

export type SimuladoQuestion = {
  id: string
  number: number
  statement: string
  options: SimuladoOption[]
  correctLetter: string | null
  /**
   * Ids dos textos-base que valem pra essa questão. Vazio em atividades antigas
   * (criadas antes dos textos-base) e em questões sem texto de apoio.
   */
  passageIds: string[]
}

export type Simulado = {
  id: string
  title: string
  createdAt: string
  // Data/hora (horário de Brasília) em que o conjunto libera pro aluno.
  // Ambos '' = liberado na criação. Ver src/lib/simulado-release.ts.
  releaseDate: string // 'AAAA-MM-DD' ou ''
  releaseTime: string // 'HH:MM' ou ''
  /** Textos-base colados junto das questões. Vazio nas atividades antigas. */
  passages: SimuladoPassage[]
  questions: SimuladoQuestion[]
  /**
   * Texto original colado pela professora (questões e gabarito), guardado
   * pra poder reabrir e editar depois — ver `updateSimuladoQuestions`.
   * Vazio nas atividades criadas antes desse campo existir.
   */
  questionsText: string
  gabaritoText: string
}

// O que o aluno recebe pra fazer a prova: sem a resposta certa embutida.
export type SimuladoQuestionForStudent = Omit<SimuladoQuestion, 'correctLetter'>
export type SimuladoForStudent = {
  id: string
  title: string
  createdAt: string
  passages: SimuladoPassage[]
  questions: SimuladoQuestionForStudent[]
}

// Atividades gravadas antes dos textos-base não têm `passages`/`passageIds`.
// Completa o formato na leitura pra tela não precisar checar `undefined`.
function normalizeSimulado(value: unknown): Simulado {
  const raw = value as Partial<Simulado>
  return {
    releaseDate: '',
    releaseTime: '',
    passages: [],
    questionsText: '',
    gabaritoText: '',
    ...raw,
    questions: (raw.questions ?? []).map(
      (q) => ({ passageIds: [], ...(q as Partial<SimuladoQuestion>) }) as SimuladoQuestion,
    ),
  } as Simulado
}

export type SimuladoAttempt = {
  id: string
  simuladoId: string
  simuladoTitle: string
  studentEmail: string
  studentName: string
  answers: Record<string, string>
  score: number
  total: number
  percent: number
  submittedAt: string
}

function simuladosStore() {
  return getStore({ name: 'simulados', consistency: 'strong' })
}

function attemptsStore() {
  return getStore({ name: 'simulado-attempts', consistency: 'strong' })
}

// Cada aluno responde uma serie uma unica vez - sem indice por aluno+serie,
// entao varre a store inteira (mesmo padrao ja usado em listMySimuladoAttempts).
async function findExistingAttempt(studentEmail: string, simuladoId: string): Promise<SimuladoAttempt | null> {
  const store = attemptsStore()
  const { blobs } = await store.list()
  for (const blob of blobs) {
    const value = await store.get(blob.key, { type: 'json' }) as SimuladoAttempt | null
    if (value && value.studentEmail === studentEmail && value.simuladoId === simuladoId) return value
  }
  return null
}

function studentDisplayName(user: unknown) {
  const u = user as Record<string, any>
  return u?.name || u?.user_metadata?.full_name || u?.userMetadata?.full_name || 'Aluno'
}

// A leitura do texto colado (textos-base + questões) e a do gabarito moram em
// src/lib/simulado-parser.ts — módulo puro, usado aqui na hora de publicar e
// também no navegador, pra mostrar a conferência antes de publicar.

// --------------------------------------------------------------------------

// Compartilhado entre criar e editar: lê o texto colado, casa com o gabarito
// e devolve tudo pronto pra gravar. Lança se não reconhecer nenhuma questão.
function parseQuestoesEGabarito(questionsText: string, gabaritoText: string) {
  const parsed = parseActivityText(questionsText)
  if (parsed.questions.length === 0) {
    // A mensagem específica do parser diz o que deu errado (formato do
    // número, alternativa faltando, etc.) — melhor que um texto genérico.
    const motivo = parsed.issues.find((i) => i.level === 'erro')?.message
    throw new Error(motivo ?? 'Não consegui reconhecer nenhuma questão nesse texto.')
  }

  const gabarito = parseGabaritoText(gabaritoText)
  let matched = 0
  const questions: SimuladoQuestion[] = parsed.questions.map((question) => {
    const letter = gabarito.get(question.number)
    const correctLetter = letter && question.options.some((o) => o.letter === letter) ? letter : null
    if (correctLetter) matched++
    return { ...question, correctLetter }
  })

  return { passages: parsed.passages, questions, issues: parsed.issues, matched }
}

export const createSimulado = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      title: boundedText(200),
      questionsText: z.string().max(200_000),
      gabaritoText: z.string().max(50_000),
      releaseDate: optionalIsoDate,
      releaseTime: optionalHhmm,
    }),
  )
  .handler(async ({ data }) => {
    const user = await getServerUser()
    if (!user || !userHasRole(user, 'admin')) throw new Error('Acesso negado.')

    const { passages, questions, issues, matched } = parseQuestoesEGabarito(data.questionsText, data.gabaritoText)

    const store = simuladosStore()
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const simulado: Simulado = {
      id,
      title: data.title.trim(),
      createdAt: new Date().toISOString(),
      releaseDate: data.releaseDate,
      releaseTime: data.releaseTime,
      passages,
      questions,
      questionsText: data.questionsText,
      gabaritoText: data.gabaritoText,
    }
    await store.setJSON(id, simulado)
    return {
      simulado,
      questionsFound: questions.length,
      passagesFound: passages.length,
      answersMatched: matched,
      issues,
    }
  })

// Reprocessa o texto colado de um conjunto já publicado — título, textos-base
// e questões são substituídos, mas id, createdAt e a liberação continuam os
// mesmos (liberação tem tela própria, "Reagendar"). Não apaga as tentativas
// já registradas: se os alunos já responderam, a nota deles fica gravada como
// estava, mas o gabarito exibido no "Ver questões" passa a ser o novo — o
// admin já foi avisado disso na tela antes de salvar (ver simulados-admin.tsx).
export const updateSimuladoQuestions = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      id: idSchema,
      title: boundedText(200),
      questionsText: z.string().max(200_000),
      gabaritoText: z.string().max(50_000),
    }),
  )
  .handler(async ({ data }) => {
    const user = await getServerUser()
    if (!user || !userHasRole(user, 'admin')) throw new Error('Acesso negado.')

    const entry = await simuladosStore().getWithMetadata(data.id, { type: 'json' })
    if (!entry) throw new Error('Esse conjunto não existe mais. Atualize a página.')
    const existente = normalizeSimulado(entry.data)

    const { passages, questions, issues, matched } = parseQuestoesEGabarito(data.questionsText, data.gabaritoText)

    const simulado: Simulado = {
      ...existente,
      title: data.title.trim(),
      passages,
      questions,
      questionsText: data.questionsText,
      gabaritoText: data.gabaritoText,
    }

    const result = await simuladosStore().setJSON(data.id, simulado, { onlyIfMatch: entry.etag })
    if (!result?.modified) throw new Error('Esse conjunto acabou de mudar. Atualize a página e tente de novo.')

    return {
      simulado,
      questionsFound: questions.length,
      passagesFound: passages.length,
      answersMatched: matched,
      issues,
    }
  })

export const deleteSimulado = createServerFn({ method: 'POST' })
  .validator(z.object({ id: idSchema }))
  .handler(async ({ data }) => {
    const user = await getServerUser()
    if (!user || !userHasRole(user, 'admin')) throw new Error('Acesso negado.')
    await simuladosStore().delete(data.id)
    return { ok: true }
  })

// Reagenda (ou libera na hora) um conjunto já publicado.
export const updateSimuladoRelease = createServerFn({ method: 'POST' })
  .validator(z.object({ id: idSchema, releaseDate: optionalIsoDate, releaseTime: optionalHhmm }))
  .handler(async ({ data }) => {
    const user = await getServerUser()
    if (!user || !userHasRole(user, 'admin')) throw new Error('Acesso negado.')

    const store = simuladosStore()
    const stored = await store.get(data.id, { type: 'json' })
    if (!stored) throw new Error('Esse conjunto não existe mais. Atualize a página.')

    const existing = normalizeSimulado(stored)
    const updated: Simulado = { ...existing, releaseDate: data.releaseDate, releaseTime: data.releaseTime }
    await store.setJSON(data.id, updated)
    return updated
  })

export const listAllSimulados = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await getServerUser()
  if (!user || !userHasRole(user, 'admin')) throw new Error('Acesso negado.')

  const store = simuladosStore()
  const { blobs } = await store.list()
  const simulados: Simulado[] = []
  for (const blob of blobs) {
    const value = await store.get(blob.key, { type: 'json' })
    if (value) simulados.push(normalizeSimulado(value))
  }
  simulados.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return simulados
})

export const listSimulados = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await getServerUser()
  if (!user || (!userHasRole(user, 'aprovado') && !userHasRole(user, 'admin'))) {
    throw new Error('Acesso negado.')
  }

  const store = simuladosStore()
  const { blobs } = await store.list()
  const now = Date.now()
  const summaries: { id: string; title: string; createdAt: string; totalQuestions: number }[] = []
  for (const blob of blobs) {
    const value = await store.get(blob.key, { type: 'json' }) as Simulado | null
    // Conjunto ainda não liberado não aparece pro aluno (nem na busca).
    if (!value || !isReleased(value, now)) continue
    summaries.push({ id: value.id, title: value.title, createdAt: value.createdAt, totalQuestions: value.questions.length })
  }
  summaries.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return summaries
})

export const getSimuladoToTake = createServerFn({ method: 'GET' })
  .validator(z.object({ id: idSchema }))
  .handler(async ({ data }) => {
    const user = await getServerUser()
    if (!user || (!userHasRole(user, 'aprovado') && !userHasRole(user, 'admin'))) {
      throw new Error('Acesso negado.')
    }

    const stored = await simuladosStore().get(data.id, { type: 'json' })
    if (!stored) throw new Error('Simulado não encontrado.')
    const simulado = normalizeSimulado(stored)
    if (!isReleased(simulado) && !isStaff(user)) throw new Error('Esse conjunto ainda não foi liberado.')

    const forStudent: SimuladoForStudent = {
      id: simulado.id,
      title: simulado.title,
      createdAt: simulado.createdAt,
      passages: simulado.passages,
      questions: simulado.questions.map(({ correctLetter: _omit, ...rest }) => rest),
    }
    return forStudent
  })

export const submitSimuladoAttempt = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      id: idSchema,
      answers: z
        .record(z.string().max(20), z.string().max(4))
        .refine((obj) => Object.keys(obj).length <= 500, 'Muitas respostas.'),
    }),
  )
  .handler(async ({ data }) => {
    const user = await getServerUser()
    if (!user || (!userHasRole(user, 'aprovado') && !userHasRole(user, 'admin'))) {
      throw new Error('Acesso negado.')
    }
    await assertActiveSession(user)
    await enforceRateLimit(ATTEMPT_RATE_LIMIT, user.email ?? '')

    const simulado = await simuladosStore().get(data.id, { type: 'json' }) as Simulado | null
    if (!simulado) throw new Error('Simulado não encontrado.')
    if (!isReleased(simulado) && !isStaff(user)) throw new Error('Esse conjunto ainda não foi liberado.')
    if (simulado.questions.length === 0) throw new Error('Esse simulado não tem questões.')

    // Uma tentativa por aluno por serie. Staff fica isento pra poder testar a
    // propria serie quantas vezes precisar antes de liberar pra turma.
    if (!isStaff(user) && (await findExistingAttempt(user.email ?? '', simulado.id))) {
      throw new Error('Você já respondeu essa série. Cada série pode ser respondida uma única vez.')
    }

    let score = 0
    const corrections = simulado.questions.map((question) => {
      const chosen = data.answers[question.id] ?? null
      const correct = chosen !== null && chosen === question.correctLetter
      if (correct) score++
      return { questionId: question.id, correctLetter: question.correctLetter, chosenLetter: chosen, correct }
    })

    const total = simulado.questions.length
    const percent = Math.round((score / total) * 1000) / 10

    const attempt: SimuladoAttempt = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      simuladoId: simulado.id,
      simuladoTitle: simulado.title,
      studentEmail: user.email ?? '',
      studentName: studentDisplayName(user),
      answers: data.answers,
      score,
      total,
      percent,
      submittedAt: new Date().toISOString(),
    }
    await attemptsStore().setJSON(attempt.id, attempt)

    return { attempt, corrections }
  })

export const listMySimuladoAttempts = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await getServerUser()
  if (!user) throw new Error('Você precisa estar logado.')

  const store = attemptsStore()
  const { blobs } = await store.list()
  const mine: SimuladoAttempt[] = []
  for (const blob of blobs) {
    const value = await store.get(blob.key, { type: 'json' })
    if (value && (value as SimuladoAttempt).studentEmail === user.email) mine.push(value as SimuladoAttempt)
  }
  mine.sort((a, b) => a.submittedAt.localeCompare(b.submittedAt))
  return mine
})

// Pra professora ver a nota de todo mundo em "Notas dos alunos" > Testinhos.
export const listAllSimuladoAttempts = createServerFn({ method: 'GET' }).handler(async (): Promise<SimuladoAttempt[]> => {
  const user = await getServerUser()
  if (!user || !isStaff(user)) throw new Error('Acesso negado.')

  const store = attemptsStore()
  const { blobs } = await store.list()
  const all: SimuladoAttempt[] = []
  for (const blob of blobs) {
    const value = await store.get(blob.key, { type: 'json' })
    if (value) all.push(value as SimuladoAttempt)
  }
  all.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
  return all
})
