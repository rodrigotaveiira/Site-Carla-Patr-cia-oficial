import { createServerFn } from '@tanstack/react-start'
import { getStore } from '@netlify/blobs'
import { getServerUser } from './auth'
import { userHasRole } from './roles'
import { STORES } from './blob-stores'
import { notificarAgendamento } from './notificar-agendamento'
import { assertActiveSession } from './session-guard.server'
import { assertRecentAuth } from './reauth'
import { enforceRateLimit } from './rate-limit'
import { boundedText, capacity as capacitySchema, hhmm, id as idSchema, isoDate } from './schemas'
import { z } from 'zod'

const AGENDAMENTO_RATE_LIMIT = { action: 'mentoria-agendamento', windowMs: 24 * 60 * 60 * 1000, max: 8 } as const

export type MentoriaGrupoStudent = { email: string; name: string }

export type MentoriaGrupoSlot = {
  id: string
  date: string // formato 'AAAA-MM-DD'
  time: string // formato 'HH:MM' — início
  /**
   * 'HH:MM' de término. Ausente nos grupos criados antes deste campo existir —
   * neles o fim é derivado de `time` + `duration`, que é o que já valia.
   */
  endTime?: string
  /**
   * Continua gravado porque o e-mail de confirmação o usa, mas deixou de ser
   * digitado: agora sai da conta entre início e término, então não há dois
   * valores podendo divergir.
   */
  duration: number // em minutos
  /** O que o aluno lê pra decidir se entra. Ausente nos grupos antigos. */
  title?: string
  /** Do que a mentoria trata. Ausente nos grupos antigos. */
  description?: string
  capacity: number // quantas pessoas cabem no grupo
  students: MentoriaGrupoStudent[]
  createdAt: string
}

/** Título mostrado quando o grupo é anterior ao campo existir. */
export const MENTORIA_GRUPO_TITULO_PADRAO = 'Mentoria em grupo'

function minutosDoRelogio(hhmmTexto: string): number {
  const [h, m] = hhmmTexto.split(':').map(Number)
  return h * 60 + m
}

function relogioDeMinutos(total: number): string {
  const t = ((total % 1440) + 1440) % 1440
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
}

/** Minutos entre início e término. Atravessar a meia-noite não é caso real aqui. */
export function duracaoEntre(inicio: string, fim: string): number {
  return minutosDoRelogio(fim) - minutosDoRelogio(inicio)
}

/** Término do grupo — o gravado, ou o derivado da duração nos grupos antigos. */
export function terminoDoGrupo(slot: Pick<MentoriaGrupoSlot, 'time' | 'endTime' | 'duration'>): string {
  return slot.endTime || relogioDeMinutos(minutosDoRelogio(slot.time) + slot.duration)
}

// "strong" garante que, assim que alguém entra ou sai do grupo, todo mundo que
// olhar a lista logo em seguida já vê a vaga atualizada (sem atraso de cache).
function slotsStore() {
  return getStore({ name: STORES.mentoriasGrupo, consistency: 'strong' })
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
  .validator(
    z.object({
      date: isoDate,
      time: hhmm,
      endTime: hhmm,
      title: boundedText(200),
      description: boundedText(2000),
      capacity: capacitySchema,
    }),
  )
  .handler(async ({ data }) => {
    const user = await getServerUser()
    if (!user || !userHasRole(user, 'admin')) throw new Error('Acesso negado.')

    if (!data.date || !data.time) throw new Error('Preencha a data e o horário.')
    const capacity = Math.floor(data.capacity)
    if (!capacity || capacity < 1) throw new Error('Informe quantas pessoas o grupo terá (mínimo 1).')

    const duration = duracaoEntre(data.time, data.endTime)
    if (duration <= 0) throw new Error('O término precisa ser depois do início.')

    const store = slotsStore()
    const id = makeSlotId(data.date, data.time)
    const slot: MentoriaGrupoSlot = {
      id,
      date: data.date,
      time: data.time,
      endTime: data.endTime,
      duration,
      title: data.title.trim(),
      description: data.description.trim(),
      capacity,
      students: [],
      createdAt: new Date().toISOString(),
    }

    const result = await store.setJSON(id, slot, { onlyIfNew: true })
    if (!result?.modified) throw new Error('Já existe um grupo cadastrado nessa data e hora.')
    return slot
  })

export const updateMentoriaGrupoSlot = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      id: idSchema,
      time: hhmm,
      endTime: hhmm,
      title: boundedText(200),
      description: boundedText(2000),
      capacity: capacitySchema,
    }),
  )
  .handler(async ({ data }) => {
    const user = await getServerUser()
    if (!user || !userHasRole(user, 'admin')) throw new Error('Acesso negado.')
    if (!data.time) throw new Error('Preencha o horário.')
    const capacity = Math.floor(data.capacity)
    if (!capacity || capacity < 1) throw new Error('Informe quantas pessoas o grupo terá (mínimo 1).')

    const duration = duracaoEntre(data.time, data.endTime)
    if (duration <= 0) throw new Error('O término precisa ser depois do início.')

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
      endTime: data.endTime,
      duration,
      title: data.title.trim(),
      description: data.description.trim(),
      capacity,
    }

    const result = await store.setJSON(data.id, updated, { onlyIfMatch: entry.etag })
    if (!result?.modified) throw new Error('Não foi possível salvar, tente novamente.')
    return updated
  })

export const deleteMentoriaGrupoSlot = createServerFn({ method: 'POST' })
  .validator(z.object({ id: idSchema }))
  .handler(async ({ data }) => {
    const user = await getServerUser()
    if (!user || !userHasRole(user, 'admin')) throw new Error('Acesso negado.')

    const store = slotsStore()
    await store.delete(data.id)
    return { ok: true }
  })

export const joinMentoriaGrupoSlot = createServerFn({ method: 'POST' })
  .validator(z.object({ id: idSchema }))
  .handler(async ({ data }) => {
    const user = await getServerUser()
    if (!user) throw new Error('Você precisa estar logado.')
    if (!userHasRole(user, 'aprovado') && !userHasRole(user, 'admin')) throw new Error('Sua conta ainda não foi aprovada.')
    await assertActiveSession(user)
    if (!userHasRole(user, 'admin')) {
      await assertRecentAuth(user)
      await enforceRateLimit(AGENDAMENTO_RATE_LIMIT, user.email ?? '')
    }

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

    // Só depois da entrada gravada. `notificarAgendamento` nunca lança: se o
    // e-mail falhar, o aluno continua no grupo.
    await notificarAgendamento({
      nomeAluno: studentName,
      emailAluno: email,
      data: slot.date,
      hora: slot.time,
      duracao: slot.duration,
      emGrupo: true,
      ocupacaoGrupo: { inscritos: updated.students.length, capacidade: slot.capacity },
    })

    return updated
  })

export const leaveMentoriaGrupoSlot = createServerFn({ method: 'POST' })
  .validator(z.object({ id: idSchema }))
  .handler(async ({ data }) => {
    const user = await getServerUser()
    if (!user) throw new Error('Você precisa estar logado.')
    await assertActiveSession(user)
    if (!userHasRole(user, 'admin')) await enforceRateLimit(AGENDAMENTO_RATE_LIMIT, user.email ?? '')

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
