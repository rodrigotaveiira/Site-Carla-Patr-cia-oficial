import { createServerFn } from '@tanstack/react-start'
import { getStore } from '@netlify/blobs'
import { getServerUser } from './auth'

// Quantos dias de acesso na semana contam como "meta cumprida"
export const WEEKLY_GOAL = 5

function activityStore() {
  return getStore({ name: 'weekly-activity', consistency: 'strong' })
}

function toISODate(date: Date) {
  return date.toISOString().slice(0, 10) // 'AAAA-MM-DD'
}

// Retorna a segunda-feira da semana que contém "date"
function startOfWeek(date: Date) {
  const d = new Date(date)
  const day = d.getDay() // 0 = domingo, 1 = segunda, ...
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

// Lista as 7 datas (segunda a domingo) da semana atual
function weekDates(date: Date) {
  const monday = startOfWeek(date)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return toISODate(d)
  })
}

export type WeeklyGoal = {
  dates: string[] // as 7 datas da semana (segunda a domingo)
  completedDates: string[] // datas em que o aluno acessou a plataforma
  goal: number
}

// Lê a semana atual do aluno logado, sem marcar nenhum acesso novo.
// Chamado assim que o dashboard carrega, só para exibir o estado já salvo.
export const getWeeklyGoal = createServerFn({ method: 'GET' }).handler(
  async (): Promise<WeeklyGoal | null> => {
    const user = await getServerUser()
    if (!user) return null

    const store = activityStore()
    const dates = weekDates(new Date())
    const completedDates: string[] = []
    for (const date of dates) {
      const value = await store.get(`${user.id}:${date}`)
      if (value) completedDates.push(date)
    }

    return { dates, completedDates, goal: WEEKLY_GOAL }
  },
)

// Quantos dias seguidos o aluno acessou a plataforma (tipo "sequência" do Duolingo).
// Hoje ainda sem acesso não quebra a sequência — só conta como quebrada depois
// que o dia passa inteiro sem nenhum acesso registrado.
const MAX_STREAK_LOOKBACK = 365

export const getStreak = createServerFn({ method: 'GET' }).handler(async (): Promise<number> => {
  const user = await getServerUser()
  if (!user) return 0

  const store = activityStore()
  const cursor = new Date()
  const today = toISODate(cursor)
  const todayMarked = !!(await store.get(`${user.id}:${today}`))
  if (!todayMarked) cursor.setDate(cursor.getDate() - 1)

  let streak = 0
  for (let i = 0; i < MAX_STREAK_LOOKBACK; i++) {
    const marked = await store.get(`${user.id}:${toISODate(cursor)}`)
    if (!marked) break
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
})

export type MonthlyActivity = {
  year: number
  month: number // 1–12
  monthLabel: string // ex. "agosto de 2026"
  daysInMonth: number
  completedDates: string[] // datas do mês em que o aluno acessou a plataforma
  goal: number
  weeks: { completedCount: number; goalMet: boolean }[] // uma entrada por semana (seg–dom) que passa pelo mês
  isCurrentMonth: boolean // false quando o aluno navegou pra um mês anterior
  canGoBack: boolean // false quando já chegou no limite de navegação pro passado
}

// Até quantos meses pro passado o aluno pode navegar no calendário.
const MAX_MONTHS_BACK = 24

// Resumo de um mês pra tela de "como foi meu mês": quantos dias o aluno
// estudou e quantas semanas (segunda a domingo) bateram a meta semanal.
// Semanas que cruzam a virada do mês só contam os dias que caem dentro deste
// mês — por isso a primeira/última semana pode aparecer "incompleta" mesmo
// que o aluno tenha estudado todos os dias que valem pra ela.
//
// Sem "year"/"month", devolve o mês atual. Com eles, deixa o aluno navegar
// pra meses anteriores (até MAX_MONTHS_BACK) — nunca pra meses futuros.
export const getMonthlyActivity = createServerFn({ method: 'GET' })
  .inputValidator((data?: { year?: number; month?: number }) => data ?? {})
  .handler(async ({ data }): Promise<MonthlyActivity | null> => {
    const user = await getServerUser()
    if (!user) return null

    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() // 0-based

    const earliest = new Date(currentYear, currentMonth - MAX_MONTHS_BACK, 1)
    const requested = new Date(
      data.year ?? currentYear,
      data.month !== undefined ? data.month - 1 : currentMonth,
      1,
    )
    // Nunca deixa navegar pro futuro nem além do limite de meses pro passado.
    const clamped = requested > new Date(currentYear, currentMonth, 1)
      ? new Date(currentYear, currentMonth, 1)
      : requested < earliest
        ? earliest
        : requested
    const year = clamped.getFullYear()
    const month = clamped.getMonth() // 0-based

    const store = activityStore()
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    const completedDates: string[] = []
    for (let day = 1; day <= daysInMonth; day++) {
      const date = toISODate(new Date(year, month, day))
      const value = await store.get(`${user.id}:${date}`)
      if (value) completedDates.push(date)
    }

    const weeksMap = new Map<string, number>()
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      const weekKey = toISODate(startOfWeek(date))
      const isoDate = toISODate(date)
      const soFar = weeksMap.get(weekKey) ?? 0
      weeksMap.set(weekKey, completedDates.includes(isoDate) ? soFar + 1 : soFar)
    }
    const weeks = Array.from(weeksMap.values()).map((completedCount) => ({
      completedCount,
      goalMet: completedCount >= WEEKLY_GOAL,
    }))

    const monthLabel = clamped.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

    return {
      year,
      month: month + 1,
      monthLabel,
      daysInMonth,
      completedDates,
      goal: WEEKLY_GOAL,
      weeks,
      isCurrentMonth: year === currentYear && month === currentMonth,
      canGoBack: !(year === earliest.getFullYear() && month === earliest.getMonth()),
    }
  })

// Marca "hoje" como um dia de acesso do aluno logado e devolve a semana inteira.
// Chamado só depois que o aluno fica pelo menos 10 minutos com o dashboard aberto.
export const registerAccessAndGetWeeklyGoal = createServerFn({ method: 'POST' }).handler(
  async (): Promise<WeeklyGoal | null> => {
    const user = await getServerUser()
    if (!user) return null

    const store = activityStore()
    const today = toISODate(new Date())
    await store.set(`${user.id}:${today}`, '1')

    const dates = weekDates(new Date())
    const completedDates: string[] = []
    for (const date of dates) {
      const value = await store.get(`${user.id}:${date}`)
      if (value) completedDates.push(date)
    }

    return { dates, completedDates, goal: WEEKLY_GOAL }
  },
)