import { createServerFn } from '@tanstack/react-start'
import { getStore } from '@netlify/blobs'
import { getServerUser } from './auth'
import { userHasRole } from './roles'
import { STORES } from './blob-stores'
import { notificarAgendamento } from './notificar-agendamento'

export type MentoriaSlot = {
  id: string
  date: string // formato 'AAAA-MM-DD'
  time: string // formato 'HH:MM'
  duration: number // em minutos
  status: 'available' | 'booked'
  student: { email: string; name: string } | null
  createdAt: string
}

// "strong" garante que, assim que um horário é marcado, todo mundo que olhar
// a lista logo em seguida já vê ele como indisponível (sem atraso de cache).
function slotsStore() {
  return getStore({ name: STORES.mentorias, consistency: 'strong' })
}

function makeSlotId(date: string, time: string) {
  return `${date}_${time}`
}

// Precisa de login: cada horário carrega nome e e-mail do aluno que reservou
// (student), e essa função fica exposta como endpoint de rede independente
// da tela — sem essa checagem, qualquer um sem conta conseguiria listar
// quem marcou encontro individual e quando.
export const listMentoriaSlots = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await getServerUser()
  if (!user || (!userHasRole(user, 'aprovado') && !userHasRole(user, 'admin'))) {
    throw new Error('Acesso negado.')
  }

  const store = slotsStore()
  const { blobs } = await store.list()
  const slots: MentoriaSlot[] = []

  for (const blob of blobs) {
    const value = await store.get(blob.key, { type: 'json' })
    if (value) slots.push(value as MentoriaSlot)
  }

  slots.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
  return slots
})

export const createMentoriaSlot = createServerFn({ method: 'POST' })
  .inputValidator((data: { date: string; time: string; duration: number }) => data)
  .handler(async ({ data }) => {
    const user = await getServerUser()
    if (!user || !userHasRole(user, 'admin')) throw new Error('Acesso negado.')

    if (!data.date || !data.time) throw new Error('Preencha a data e o horário.')

    const store = slotsStore()
    const id = makeSlotId(data.date, data.time)
    const slot: MentoriaSlot = {
      id,
      date: data.date,
      time: data.time,
      duration: data.duration || 40,
      status: 'available',
      student: null,
      createdAt: new Date().toISOString(),
    }

    const result = await store.setJSON(id, slot, { onlyIfNew: true })
    if (!result?.modified) throw new Error('Já existe um horário cadastrado nessa data e hora.')
    return slot
  })

export const deleteMentoriaSlot = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const user = await getServerUser()
    if (!user || !userHasRole(user, 'admin')) throw new Error('Acesso negado.')

    const store = slotsStore()
    await store.delete(data.id)
    return { ok: true }
  })

export const bookMentoriaSlot = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const user = await getServerUser()
    if (!user) throw new Error('Você precisa estar logado.')
    if (!userHasRole(user, 'aprovado') && !userHasRole(user, 'admin')) throw new Error('Sua conta ainda não foi aprovada.')

    const store = slotsStore()

    // Cada aluno só pode ter um encontro individual futuro marcado por vez —
    // evita que um aluno reserve vários horários e "trave" a agenda pros outros.
    if (!userHasRole(user, 'admin')) {
      const today = new Date().toISOString().slice(0, 10)
      const { blobs } = await store.list()
      for (const blob of blobs) {
        if (blob.key === data.id) continue
        const existing = await store.get(blob.key, { type: 'json' }) as MentoriaSlot | null
        if (existing?.status === 'booked' && existing.student?.email === user.email && existing.date >= today) {
          throw new Error('Você já tem um encontro individual marcado. Cancele-o antes de marcar outro horário.')
        }
      }
    }

    const entry = await store.getWithMetadata(data.id, { type: 'json' })
    if (!entry) throw new Error('Esse horário não existe mais. Atualize a página.')

    const slot = entry.data as MentoriaSlot
    if (slot.status !== 'available') {
      throw new Error('Esse horário acabou de ser reservado por outro aluno. Escolha outro.')
    }

    const studentName =
      (user as any).name ||
      (user as any).userMetadata?.full_name ||
      (user as any).user_metadata?.full_name ||
      'Aluno'

    const updated: MentoriaSlot = {
      ...slot,
      status: 'booked',
      student: { email: user.email ?? '', name: studentName },
    }

    // onlyIfMatch garante que, se dois alunos clicarem quase ao mesmo tempo,
    // só o primeiro consegue — o segundo recebe um erro em vez de sobrescrever.
    const result = await store.setJSON(data.id, updated, { onlyIfMatch: entry.etag })
    if (!result?.modified) {
      throw new Error('Esse horário acabou de ser reservado por outro aluno. Escolha outro.')
    }

    // Só depois da reserva gravada. `notificarAgendamento` nunca lança: se o
    // e-mail falhar, o aluno continua com o horário marcado.
    await notificarAgendamento({
      nomeAluno: studentName,
      emailAluno: user.email ?? '',
      data: slot.date,
      hora: slot.time,
      duracao: slot.duration,
      emGrupo: false,
    })

    return updated
  })

export const cancelMentoriaSlot = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const user = await getServerUser()
    if (!user) throw new Error('Você precisa estar logado.')

    const store = slotsStore()
    const entry = await store.getWithMetadata(data.id, { type: 'json' })
    if (!entry) throw new Error('Esse horário não existe mais.')

    const slot = entry.data as MentoriaSlot
    const isAdmin = userHasRole(user, 'admin')
    if (slot.student?.email !== user.email && !isAdmin) {
      throw new Error('Você só pode cancelar os seus próprios horários.')
    }

    const updated: MentoriaSlot = { ...slot, status: 'available', student: null }
    const result = await store.setJSON(data.id, updated, { onlyIfMatch: entry.etag })
    if (!result?.modified) throw new Error('Não foi possível cancelar, tente novamente.')
    return updated
  })
