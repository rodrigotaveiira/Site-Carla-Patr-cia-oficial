import { createServerFn } from '@tanstack/react-start'
import { getStore } from '@netlify/blobs'
import { getServerUser } from './auth'
import { userHasRole } from './roles'

export type MentoriaGrupoStudent = { email: string; name: string }

export type MentoriaGrupoSlot = {
  id: string
  date: string // formato 'AAAA-MM-DD'
  time: string // formato 'HH:MM'
  duration: number // em minutos
  capacity: number // quantas pessoas cabem no grupo
  students: MentoriaGrupoStudent[]
  createdAt: string
}

// "strong" garante que, assim que alguém entra ou sai do grupo, todo mundo que
// olhar a lista logo em seguida já vê a vaga atualizada (sem atraso de cache).
function slotsStore() {
  return getStore({ name: 'mentorias-grupo-slots', consistency: 'strong' })
}

function makeSlotId(date: string, time: string) {
  return `${date}_${time}`
}

// Precisa de login: cada grupo carrega nome e e-mail de todo aluno inscrito
// (students), e essa função fica exposta como endpoint de rede independente
// da tela — sem essa checagem, qualquer um sem conta conseguiria listar
// quem está em cada mentoria em grupo.
export const listMentoriaGrupoSlots = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await getServerUser()
  if (!user || (!userHasRole(user, 'aprovado') && !userHasRole(user, 'admin'))) {
    throw new Error('Acesso negado.')
  }

  const store = slotsStore()
  const { blobs } = await store.list()
  const slots: MentoriaGrupoSlot[] = []

  for (const blob of blobs) {
    const value = await store.get(blob.key, { type: 'json' })
    if (value) slots.push(value as MentoriaGrupoSlot)
  }

  slots.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
  return slots
})

export const createMentoriaGrupoSlot = createServerFn({ method: 'POST' })
  .inputValidator((data: { date: string; time: string; duration: number; capacity: number }) => data)
  .handler(async ({ data }) => {
    const user = await getServerUser()
    if (!user || !userHasRole(user, 'admin')) throw new Error('Acesso negado.')

    if (!data.date || !data.time) throw new Error('Preencha a data e o horário.')
    const capacity = Math.floor(data.capacity)
    if (!capacity || capacity < 1) throw new Error('Informe quantas pessoas o grupo terá (mínimo 1).')

    const store = slotsStore()
    const id = makeSlotId(data.date, data.time)
    const slot: MentoriaGrupoSlot = {
      id,
      date: data.date,
      time: data.time,
      duration: data.duration || 40,
      capacity,
      students: [],
      createdAt: new Date().toISOString(),
    }

    const result = await store.setJSON(id, slot, { onlyIfNew: true })
    if (!result?.modified) throw new Error('Já existe um grupo cadastrado nessa data e hora.')
    return slot
  })

export const updateMentoriaGrupoSlot = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: string; time: string; duration: number; capacity: number }) => data)
  .handler(async ({ data }) => {
    const user = await getServerUser()
    if (!user || !userHasRole(user, 'admin')) throw new Error('Acesso negado.')
    if (!data.time) throw new Error('Preencha o horário.')
    const capacity = Math.floor(data.capacity)
    if (!capacity || capacity < 1) throw new Error('Informe quantas pessoas o grupo terá (mínimo 1).')

    const store = slotsStore()
    const entry = await store.getWithMetadata(data.id, { type: 'json' })
    if (!entry) throw new Error('Esse grupo não existe mais. Atualize a página.')

    const slot = entry.data as MentoriaGrupoSlot
    if (capacity < slot.students.length) {
      throw new Error(`Não é possível reduzir a capacidade abaixo do número de alunos já inscritos (${slot.students.length}).`)
    }

    const updated: MentoriaGrupoSlot = {
      ...slot,
      time: data.time,
      duration: data.duration || slot.duration,
      capacity,
    }

    const result = await store.setJSON(data.id, updated, { onlyIfMatch: entry.etag })
    if (!result?.modified) throw new Error('Não foi possível salvar, tente novamente.')
    return updated
  })

export const deleteMentoriaGrupoSlot = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const user = await getServerUser()
    if (!user || !userHasRole(user, 'admin')) throw new Error('Acesso negado.')

    const store = slotsStore()
    await store.delete(data.id)
    return { ok: true }
  })

export const joinMentoriaGrupoSlot = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const user = await getServerUser()
    if (!user) throw new Error('Você precisa estar logado.')
    if (!userHasRole(user, 'aprovado') && !userHasRole(user, 'admin')) throw new Error('Sua conta ainda não foi aprovada.')

    const store = slotsStore()
    const entry = await store.getWithMetadata(data.id, { type: 'json' })
    if (!entry) throw new Error('Esse grupo não existe mais. Atualize a página.')

    const slot = entry.data as MentoriaGrupoSlot
    const email = user.email ?? ''
    if (slot.students.some((student) => student.email === email)) {
      throw new Error('Você já está nesse grupo.')
    }
    if (slot.students.length >= slot.capacity) {
      throw new Error('Esse grupo acabou de lotar. Escolha outro horário.')
    }

    const studentName =
      (user as any).name ||
      (user as any).userMetadata?.full_name ||
      (user as any).user_metadata?.full_name ||
      'Aluno'

    const updated: MentoriaGrupoSlot = {
      ...slot,
      students: [...slot.students, { email, name: studentName }],
    }

    // onlyIfMatch garante que, se dois alunos entrarem quase ao mesmo tempo,
    // não estourem a capacidade — o segundo recebe um erro em vez de sobrescrever.
    const result = await store.setJSON(data.id, updated, { onlyIfMatch: entry.etag })
    if (!result?.modified) {
      throw new Error('Esse grupo acabou de mudar. Atualize a página e tente de novo.')
    }
    return updated
  })

export const leaveMentoriaGrupoSlot = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const user = await getServerUser()
    if (!user) throw new Error('Você precisa estar logado.')

    const store = slotsStore()
    const entry = await store.getWithMetadata(data.id, { type: 'json' })
    if (!entry) throw new Error('Esse grupo não existe mais.')

    const slot = entry.data as MentoriaGrupoSlot
    const isAdmin = userHasRole(user, 'admin')
    const alreadyIn = slot.students.some((student) => student.email === user.email)
    if (!alreadyIn && !isAdmin) {
      throw new Error('Você não está nesse grupo.')
    }

    const updated: MentoriaGrupoSlot = {
      ...slot,
      students: slot.students.filter((student) => student.email !== user.email),
    }
    const result = await store.setJSON(data.id, updated, { onlyIfMatch: entry.etag })
    if (!result?.modified) throw new Error('Não foi possível sair do grupo, tente novamente.')
    return updated
  })
