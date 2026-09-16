import { createServerFn } from '@tanstack/react-start'
import { getStore } from '@netlify/blobs'
import { admin as identityAdmin } from '@netlify/identity'
import { getServerUser } from './auth'
import { userHasRole, isStaff } from './roles'
import type { RedacaoSubmission } from './redacoes'
import type { MaterialDownloadRecord } from './material-downloads'
import type { SimuladoAttempt } from './simulados'
import { WEEKLY_GOAL } from './weekly-activity'

// Visão de "como os alunos estão" pro painel admin, separada em blocos
// (Redação, Materiais, Testes, Progresso).
//
// O diretório de alunos vem de `admin.listUsers()`, do próprio pacote
// @netlify/identity — server-only, usa o token de operador que já vem de
// graça em toda Netlify Function, sem segredo novo pra configurar. Antes a
// lista vinha do store `session-history` (só quem já tinha logado
// alguma vez): um aluno aprovado que nunca entrou no site simplesmente não
// aparecia, mesmo com a conta liberada. `listUsers` traz todo mundo que
// existe de verdade no Identity, então a lista aqui reflete a turma real.
async function listApprovedStudents() {
  const PER_PAGE = 200
  const MAX_PAGINAS = 20 // trava de segurança — não afeta hoje: 200*20 = 4000 contas.
  const todos: Awaited<ReturnType<typeof identityAdmin.listUsers>> = []
  for (let page = 1; page <= MAX_PAGINAS; page++) {
    const pagina = await identityAdmin.listUsers({ page, perPage: PER_PAGE })
    todos.push(...pagina)
    if (pagina.length < PER_PAGE) break
  }
  // Só quem tem a conta liberada como aluno — de fora ficam quem ainda está
  // "aguardando aprovação" (sem essa role ainda) e a equipe (admin/professor),
  // que não é "aluno" pra fins deste relatório.
  return todos.filter((u) => userHasRole(u, 'aprovado') && !isStaff(u))
}

function redacoesStore() {
  return getStore({ name: 'redacoes-submissions', consistency: 'strong' })
}

function materialDownloadsStore() {
  return getStore({ name: 'material-downloads', consistency: 'strong' })
}

// Mesmo store de src/lib/simulados.ts — lido direto aqui (em vez de chamar a
// server function de lá) pelo mesmo motivo de redação/materiais acima: um
// acesso a mais ao store é mais simples e barato do que reentrar noutra
// createServerFn de dentro desta.
function simuladoAttemptsStore() {
  return getStore({ name: 'simulado-attempts', consistency: 'strong' })
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

export type SimuladoAttemptResumo = {
  simuladoTitle: string
  score: number
  total: number
  percent: number
  submittedAt: string
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
  testes: {
    averagePercent: number | null
    attemptsCount: number
    recent: SimuladoAttemptResumo[]
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
  classTestesAverage: number | null
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

    let directory: { id: string; email: string; name: string }[] = []
    try {
      const aprovados = await listApprovedStudents()
      directory = aprovados
        .filter((u): u is typeof u & { email: string } => !!u.email)
        .map((u) => ({ id: u.id, email: u.email, name: u.name || 'Aluno' }))
    } catch (error) {
      console.error('Evolução dos alunos: falha ao listar o diretório de alunos (Identity):', error)
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

    const attemptsByEmail = new Map<string, SimuladoAttempt[]>()
    try {
      const store = simuladoAttemptsStore()
      const { blobs } = await store.list()
      for (const blob of blobs) {
        try {
          const value = (await store.get(blob.key, { type: 'json' })) as SimuladoAttempt | null
          if (!value) continue
          const list = attemptsByEmail.get(value.studentEmail) ?? []
          list.push(value)
          attemptsByEmail.set(value.studentEmail, list)
        } catch (error) {
          console.error(`Evolução dos alunos: falha ao ler tentativa de teste "${blob.key}":`, error)
        }
      }
    } catch (error) {
      console.error('Evolução dos alunos: falha ao listar tentativas de teste:', error)
    }

    const students: StudentEvolution[] = []
    for (const entry of directory) {
      const submissions = (redByEmail.get(entry.email) ?? []).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
      const corrected = submissions.filter((s) => s.status === 'corrigida' && s.grade !== null)
      const average = corrected.length > 0
        ? Math.round((corrected.reduce((sum, s) => sum + (s.grade ?? 0), 0) / corrected.length) * 100) / 100
        : null

      const downloads = (downloadsByEmail.get(entry.email) ?? []).sort((a, b) => b.downloadedAt.localeCompare(a.downloadedAt))

      const attempts = (attemptsByEmail.get(entry.email) ?? []).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
      const averagePercent = attempts.length > 0
        ? Math.round((attempts.reduce((sum, a) => sum + a.percent, 0) / attempts.length) * 100) / 100
        : null

      let streak = 0
      let completedThisWeek = 0
      try {
        ;({ streak, completedThisWeek } = await computeStreakAndWeek(entry.id))
      } catch (error) {
        console.error(`Evolução dos alunos: falha ao calcular progresso de "${entry.email}":`, error)
      }

      students.push({
        email: entry.email,
        name: entry.name,
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
        testes: {
          averagePercent,
          attemptsCount: attempts.length,
          recent: attempts.slice(0, 5).map((a) => ({ simuladoTitle: a.simuladoTitle, score: a.score, total: a.total, percent: a.percent, submittedAt: a.submittedAt })),
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

    const withTestes = students.filter((s) => s.testes.averagePercent !== null)
    const classTestesAverage = withTestes.length > 0
      ? Math.round((withTestes.reduce((sum, s) => sum + (s.testes.averagePercent ?? 0), 0) / withTestes.length) * 100) / 100
      : null

    const withStreak = students.filter((s) => s.progresso.streak > 0)
    const averageStreak = withStreak.length > 0
      ? Math.round(withStreak.reduce((sum, s) => sum + s.progresso.streak, 0) / withStreak.length)
      : null

    return { students, classRedacaoAverage, totalDownloads, classTestesAverage, averageStreak }
  },
)
