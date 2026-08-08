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

// Marca "hoje" como um dia de acesso do aluno logado e devolve a semana inteira.
// Chamado automaticamente sempre que o dashboard carrega.
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
