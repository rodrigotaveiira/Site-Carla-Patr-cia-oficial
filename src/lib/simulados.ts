import { createServerFn } from '@tanstack/react-start'
import { getStore } from '@netlify/blobs'
import { getServerUser } from './auth'
import { userHasRole } from './roles'

export type SimuladoOption = { letter: string; text: string }

export type SimuladoQuestion = {
  id: string
  number: number
  statement: string
  options: SimuladoOption[]
  correctLetter: string | null
}

export type Simulado = {
  id: string
  title: string
  createdAt: string
  questions: SimuladoQuestion[]
}

// O que o aluno recebe pra fazer a prova: sem a resposta certa embutida.
export type SimuladoQuestionForStudent = Omit<SimuladoQuestion, 'correctLetter'>
export type SimuladoForStudent = { id: string; title: string; createdAt: string; questions: SimuladoQuestionForStudent[] }

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

function studentDisplayName(user: unknown) {
  const u = user as Record<string, any>
  return u?.name || u?.user_metadata?.full_name || u?.userMetadata?.full_name || 'Aluno'
}

// --- Parsing: transforma texto colado em questões estruturadas -----------
//
// Formato esperado para as questões (cada uma começando numa nova linha):
//   1) Enunciado da questão, pode ocupar mais de uma linha...
//   a) alternativa A
//   b) alternativa B
//   c) alternativa C
//   d) alternativa D
//   e) alternativa E
//
// Formato esperado para o gabarito (bem flexível): "1) C", "1 - C", "1: C",
// "1C", tudo numa linha ou separado por vírgula — o sistema procura pares
// número+letra em qualquer um desses formatos.

const QUESTION_START = /^\s*(\d{1,3})[.)\-–]\s*(.*)$/
const OPTION_START = /^\s*([A-Ea-e])[.)\-–]\s*(.*)$/

export function parseQuestionsText(raw: string): SimuladoQuestion[] {
  const lines = raw.replace(/\r\n/g, '\n').split('\n')

  type Block = { number: number; lines: string[] }
  const blocks: Block[] = []
  for (const line of lines) {
    const match = line.match(QUESTION_START)
    if (match) {
      blocks.push({ number: Number(match[1]), lines: [match[2]] })
    } else if (blocks.length > 0) {
      blocks[blocks.length - 1].lines.push(line)
    }
  }

  const questions: SimuladoQuestion[] = []
  for (const block of blocks) {
    const statementLines: string[] = []
    const options: SimuladoOption[] = []
    let current: SimuladoOption | null = null

    for (const line of block.lines) {
      const optionMatch = line.match(OPTION_START)
      if (optionMatch) {
        current = { letter: optionMatch[1].toUpperCase(), text: optionMatch[2].trim() }
        options.push(current)
      } else if (current) {
        const extra = line.trim()
        if (extra) current.text = `${current.text} ${extra}`.trim()
      } else {
        statementLines.push(line)
      }
    }

    const statement = statementLines.join(' ').replace(/\s+/g, ' ').trim()
    if (!statement || options.length < 2) continue // bloco sem enunciado ou sem alternativas suficientes: ignora

    questions.push({
      id: `q${block.number}`,
      number: block.number,
      statement,
      options,
      correctLetter: null,
    })
  }

  questions.sort((a, b) => a.number - b.number)
  return questions
}

export function parseGabaritoText(raw: string): Map<number, string> {
  const map = new Map<number, string>()
  const pattern = /(\d{1,3})\s*[.)\-:–]?\s*([A-Ea-e])\b/g
  let match: RegExpExecArray | null
  while ((match = pattern.exec(raw))) {
    map.set(Number(match[1]), match[2].toUpperCase())
  }
  return map
}

// --------------------------------------------------------------------------

export const createSimulado = createServerFn({ method: 'POST' })
  .inputValidator((data: { title: string; questionsText: string; gabaritoText: string }) => data)
  .handler(async ({ data }) => {
    const user = await getServerUser()
    if (!user || !userHasRole(user, 'admin')) throw new Error('Acesso negado.')

    if (!data.title.trim()) throw new Error('Dê um nome para o simulado.')
    const questions = parseQuestionsText(data.questionsText)
    if (questions.length === 0) {
      throw new Error('Não consegui reconhecer nenhuma questão nesse texto. Confira o formato (1) enunciado, a) b) c)...).')
    }

    const gabarito = parseGabaritoText(data.gabaritoText)
    let matched = 0
    for (const question of questions) {
      const letter = gabarito.get(question.number)
      if (letter && question.options.some((o) => o.letter === letter)) {
        question.correctLetter = letter
        matched++
      }
    }

    const store = simuladosStore()
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const simulado: Simulado = {
      id,
      title: data.title.trim(),
      createdAt: new Date().toISOString(),
      questions,
    }
    await store.setJSON(id, simulado)
    return { simulado, questionsFound: questions.length, answersMatched: matched }
  })

export const deleteSimulado = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const user = await getServerUser()
    if (!user || !userHasRole(user, 'admin')) throw new Error('Acesso negado.')
    await simuladosStore().delete(data.id)
    return { ok: true }
  })

export const listAllSimulados = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await getServerUser()
  if (!user || !userHasRole(user, 'admin')) throw new Error('Acesso negado.')

  const store = simuladosStore()
  const { blobs } = await store.list()
  const simulados: Simulado[] = []
  for (const blob of blobs) {
    const value = await store.get(blob.key, { type: 'json' })
    if (value) simulados.push(value as Simulado)
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
  const summaries: { id: string; title: string; createdAt: string; totalQuestions: number }[] = []
  for (const blob of blobs) {
    const value = await store.get(blob.key, { type: 'json' }) as Simulado | null
    if (value) summaries.push({ id: value.id, title: value.title, createdAt: value.createdAt, totalQuestions: value.questions.length })
  }
  summaries.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return summaries
})

export const getSimuladoToTake = createServerFn({ method: 'GET' })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const user = await getServerUser()
    if (!user || (!userHasRole(user, 'aprovado') && !userHasRole(user, 'admin'))) {
      throw new Error('Acesso negado.')
    }

    const simulado = await simuladosStore().get(data.id, { type: 'json' }) as Simulado | null
    if (!simulado) throw new Error('Simulado não encontrado.')

    const forStudent: SimuladoForStudent = {
      id: simulado.id,
      title: simulado.title,
      createdAt: simulado.createdAt,
      questions: simulado.questions.map(({ correctLetter: _omit, ...rest }) => rest),
    }
    return forStudent
  })

export const submitSimuladoAttempt = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: string; answers: Record<string, string> }) => data)
  .handler(async ({ data }) => {
    const user = await getServerUser()
    if (!user || (!userHasRole(user, 'aprovado') && !userHasRole(user, 'admin'))) {
      throw new Error('Acesso negado.')
    }

    const simulado = await simuladosStore().get(data.id, { type: 'json' }) as Simulado | null
    if (!simulado) throw new Error('Simulado não encontrado.')
    if (simulado.questions.length === 0) throw new Error('Esse simulado não tem questões.')

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
