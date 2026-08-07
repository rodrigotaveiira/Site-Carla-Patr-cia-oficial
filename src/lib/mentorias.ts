import { createServerFn } from '@tanstack/react-start'
import { getStore } from '@netlify/blobs'
import { getServerUser } from './auth'
import { userHasRole } from './roles'

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
  return getStore({ name: 'mentorias-slots', consistency: 'strong' })
}

function makeSlotId(date: string, time: string) {
  return `${date}_${time}`
}

export const listMentoriaSlots = createServerFn({ method: 'GET' }).handler(async () => {
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
  .validator((data: { date: string; time: string; duration: number }) => data)
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
      duration: data.duration || 45,
      status: 'available',
      student: null,
      createdAt: new Date().toISOString(),
    }

    const result = await store.setJSON(id, slot, { onlyIfNew: true })
    if (!result?.modified) throw new Error('Já existe um horário cadastrado nessa data e hora.')
    return slot
  })

export const deleteMentoriaSlot = createServerFn({ method: 'POST' })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const user = await getServerUser()
    if (!user || !userHasRole(user, 'admin')) throw new Error('Acesso negado.')

    const store = slotsStore()
    await store.delete(data.id)
    return { ok: true }
  })

export const bookMentoriaSlot = createServerFn({ method: 'POST' })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const user = await getServerUser()
    if (!user) throw new Error('Você precisa estar logado.')
    if (!userHasRole(user, 'aprovado') && !userHasRole(user, 'admin')) throw new Error('Sua conta ainda não foi aprovada.')

    const store = slotsStore()
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
    return updated
  })

export const cancelMentoriaSlot = createServerFn({ method: 'POST' })
  .validator((data: { id: string }) => data)
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
