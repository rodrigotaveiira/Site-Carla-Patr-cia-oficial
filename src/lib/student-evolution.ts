import { createServerFn } from '@tanstack/react-start'
import { getStore } from '@netlify/blobs'
import { getServerUser } from './auth'
import { isStaff } from './roles'
import type { RedacaoSubmission } from './redacoes'
import type { StudentSessionHistory } from './sessions'
import type { MaterialDownloadRecord } from './material-downloads'
import { WEEKLY_GOAL } from './weekly-activity'

// Visão de "como os alunos estão" pro painel admin, separada em blocos
// (Redação, Materiais, Progresso). O diretório de alunos conhecidos vem do
// mesmo store de session-history usado pro aviso de material novo por
// e-mail — só alcança quem já logou no site pelo menos uma vez, já que não
// existe integração com o diretório completo de usuários do Netlify Identity.
function sessionHistoryStore() {
  return getStore({ name: 'session-history', consistency: 'strong' })
}

function redacoesStore() {
  return getStore({ name: 'redacoes-submissions', consistency: 'strong' })
}

function materialDownloadsStore() {
  return getStore({ name: 'material-downloads', consistency: 'strong' })
}

// Mesmo store usado em weekly-activity.ts, indexado por `${userId}:${data}`.
function activityStore() {
  return getStore({ name: 'weekly-activity', consistency: 'strong' })
}

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function startOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function weekDates(date: Date): string[] {
  const monday = startOfWeek(date)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return toISODate(d)
  })
}

export type RedacaoResumo = {
  id: string
  title: string
  submittedAt: string
  status: 'pendente' | 'corrigida'
  grade: number | null
}

export type MaterialDownloadResumo = {
  materialTitle: string
  downloadedAt: string
}

export type StudentEvolution = {
  email: string
  name: string
  redacao: {
    average: number | null
    correctedCount: number
    totalCount: number
    recent: RedacaoResumo[]
  }
  materiais: {
    totalDownloads: number
    recent: MaterialDownloadResumo[]
  }
  progresso: {
    streak: number
    completedThisWeek: number
    weeklyGoal: number
  }
}

export type StudentEvolutionSummary = {
  students: StudentEvolution[]
  classRedacaoAverage: number | null
  totalDownloads: number
  averageStreak: number | null
}

const MAX_STREAK_LOOKBACK = 365

// Mesmo cálculo de getStreak/getWeeklyGoal em weekly-activity.ts, mas
// parametrizado por id de aluno em vez de pegar da sessão logada — porque
// aqui é a equipe olhando o progresso de outra pessoa.
async function computeStreakAndWeek(userId: string): Promise<{ streak: number; completedThisWeek: number }> {
  const store = activityStore()

  const cursor = new Date()
  const today = toISODate(cursor)
  const todayMarked = !!(await store.get(`${userId}:${today}`))
  if (!todayMarked) cursor.setDate(cursor.getDate() - 1)

  let streak = 0
  for (let i = 0; i < MAX_STREAK_LOOKBACK; i++) {
    const marked = await store.get(`${userId}:${toISODate(cursor)}`)
    if (!marked) break
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }

  let completedThisWeek = 0
  for (const date of weekDates(new Date())) {
    if (await store.get(`${userId}:${date}`)) completedThisWeek++
  }

  return { streak, completedThisWeek }
}

export const getStudentEvolution = createServerFn({ method: 'GET' }).handler(
  async (): Promise<StudentEvolutionSummary> => {
    const user = await getServerUser()
    if (!user || !isStaff(user)) throw new Error('Acesso negado.')

    const directory: (StudentSessionHistory & { id?: string })[] = []
    try {
      const historyStore = sessionHistoryStore()
      const { blobs } = await historyStore.list()
      for (const blob of blobs) {
        try {
          const value = await historyStore.get(blob.key, { type: 'json' })
          if (value) directory.push(value as StudentSessionHistory & { id?: string })
        } catch (error) {
          console.error(`Evolução dos alunos: falha ao ler sessão "${blob.key}":`, error)
        }
      }
    } catch (error) {
      console.error('Evolução dos alunos: falha ao listar o diretório de alunos:', error)
    }

    const redByEmail = new Map<string, RedacaoSubmission[]>()
    try {
      const store = redacoesStore()
      const { blobs } = await store.list()
      for (const blob of blobs) {
        try {
          const value = (await store.get(blob.key, { type: 'json' })) as RedacaoSubmission | null
          if (!value) continue
          const list = redByEmail.get(value.studentEmail) ?? []
          list.push(value)
          redByEmail.set(value.studentEmail, list)
        } catch (error) {
          console.error(`Evolução dos alunos: falha ao ler redação "${blob.key}":`, error)
        }
      }
    } catch (error) {
      console.error('Evolução dos alunos: falha ao listar redações:', error)
    }

    const downloadsByEmail = new Map<string, MaterialDownloadResumo[]>()
    try {
      const store = materialDownloadsStore()
      const { blobs } = await store.list()
      for (const blob of blobs) {
        try {
          const value = (await store.get(blob.key, { type: 'json' })) as MaterialDownloadRecord | null
          if (!value) continue
          const list = downloadsByEmail.get(value.studentEmail) ?? []
          list.push({ materialTitle: value.materialTitle, downloadedAt: value.downloadedAt })
          downloadsByEmail.set(value.studentEmail, list)
        } catch (error) {
          console.error(`Evolução dos alunos: falha ao ler download "${blob.key}":`, error)
        }
      }
    } catch (error) {
      console.error('Evolução dos alunos: falha ao listar downloads de materiais:', error)
    }

    const students: StudentEvolution[] = []
    for (const entry of directory) {
      const submissions = (redByEmail.get(entry.email) ?? []).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
      const corrected = submissions.filter((s) => s.status === 'corrigida' && s.grade !== null)
      const average = corrected.length > 0
        ? Math.round((corrected.reduce((sum, s) => sum + (s.grade ?? 0), 0) / corrected.length) * 100) / 100
        : null

      const downloads = (downloadsByEmail.get(entry.email) ?? []).sort((a, b) => b.downloadedAt.localeCompare(a.downloadedAt))

      let streak = 0
      let completedThisWeek = 0
      if (entry.id) {
        try {
          ;({ streak, completedThisWeek } = await computeStreakAndWeek(entry.id))
        } catch (error) {
          console.error(`Evolução dos alunos: falha ao calcular progresso de "${entry.email}":`, error)
        }
      }

      students.push({
        email: entry.email,
        name: entry.name || 'Aluno',
        redacao: {
          average,
          correctedCount: corrected.length,
          totalCount: submissions.length,
          recent: submissions.slice(0, 5).map((s) => ({ id: s.id, title: s.title, submittedAt: s.submittedAt, status: s.status, grade: s.grade })),
        },
        materiais: {
          totalDownloads: downloads.length,
          recent: downloads.slice(0, 5),
        },
        progresso: { streak, completedThisWeek, weeklyGoal: WEEKLY_GOAL },
      })
    }

    students.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))

    const withGrade = students.filter((s) => s.redacao.average !== null)
    const classRedacaoAverage = withGrade.length > 0
      ? Math.round((withGrade.reduce((sum, s) => sum + (s.redacao.average ?? 0), 0) / withGrade.length) * 100) / 100
      : null

    const totalDownloads = students.reduce((sum, s) => sum + s.materiais.totalDownloads, 0)

    const withStreak = students.filter((s) => s.progresso.streak > 0)
    const averageStreak = withStreak.length > 0
      ? Math.round(withStreak.reduce((sum, s) => sum + s.progresso.streak, 0) / withStreak.length)
      : null

    return { students, classRedacaoAverage, totalDownloads, averageStreak }
  },
)
