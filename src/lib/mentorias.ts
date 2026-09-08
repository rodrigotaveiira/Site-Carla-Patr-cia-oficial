import { createServerFn } from '@tanstack/react-start'
import { getStore } from '@netlify/blobs'
import { z } from 'zod'
import { getServerUser } from './auth'
import { userHasRole } from './roles'
import { STORES } from './blob-stores'
import { notificarAgendamento } from './notificar-agendamento'
import { assertActiveSession } from './session-guard.server'
import { assertRecentAuth } from './reauth'
import { enforceRateLimit } from './rate-limit'
import { durationMinutes, hhmm, id as idSchema, isoDate } from './schemas'

export type MentoriaSlot = {
  id: string
  date: string // formato 'AAAA-MM-DD'
  time: string // formato 'HH:MM'
  duration: number // em minutos
  status: 'available' | 'booked'
  student: { email: string; name: string } | null
  createdAt: string
}

type ActiveBookingClaim = { slotId: string; date: string; claimedAt: string }

// "strong" garante que, assim que um horário é marcado, todo mundo que olhar
// a lista logo em seguida já vê ele como indisponível (sem atraso de cache).
function slotsStore() {
  return getStore({ name: STORES.mentorias, consistency: 'strong' })
}

// Um registro por aluno (no máximo um) com a mentoria futura que ele tem
// marcada agora. Existe só pra tornar atômica a regra "uma mentoria futura
// por aluno" — ver comentário em `bookMentoriaSlot`.
function activeBookingStore() {
  return getStore({ name: STORES.mentoriaAtiva, consistency: 'strong' })
}

function makeSlotId(date: string, time: string) {
  return `${date}_${time}`
}

// Precisa de login: cada horário carrega nome e e-mail do aluno que reservou
// (student), e essa função fica exposta como endpoint de rede independente
// da tela — sem essa checagem, qualquer um sem conta conseguiria listar
// quem marcou mentoria individual e quando.
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
  .validator(z.object({ date: isoDate, time: hhmm, duration: durationMinutes }))
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
  .validator(z.object({ id: idSchema }))
  .handler(async ({ data }) => {
    const user = await getServerUser()
    if (!user || !userHasRole(user, 'admin')) throw new Error('Acesso negado.')

    const store = slotsStore()
    await store.delete(data.id)
    return { ok: true }
  })

const AGENDAMENTO_RATE_LIMIT = { action: 'mentoria-agendamento', windowMs: 24 * 60 * 60 * 1000, max: 8 } as const

export const bookMentoriaSlot = createServerFn({ method: 'POST' })
  .validator(z.object({ id: idSchema }))
  .handler(async ({ data }) => {
    const user = await getServerUser()
    if (!user) throw new Error('Você precisa estar logado.')
    if (!userHasRole(user, 'aprovado') && !userHasRole(user, 'admin')) throw new Error('Sua conta ainda não foi aprovada.')
    await assertActiveSession(user)

    const isAdmin = userHasRole(user, 'admin')
    const email = user.email ?? ''
    if (!isAdmin) {
      await assertRecentAuth(user)
      await enforceRateLimit(AGENDAMENTO_RATE_LIMIT, email)
    }

    const store = slotsStore()
    const claimStore = activeBookingStore()
    const today = new Date().toISOString().slice(0, 10)

    // Cada aluno só pode ter uma mentoria individual futura marcada por vez —
    // evita que um aluno reserve vários horários e "trave" a agenda pros
    // outros. Isso precisa ser atômico: dois pedidos concorrentes do MESMO
    // aluno pra DOIS horários diferentes não podem passar os dois. Por isso a
    // checagem não é "varrer os slots e ver se algum já é meu" (isso é
    // ler-então-agir em chaves diferentes, corrida clássica) — em vez disso,
    // os dois pedidos disputam a mesma chave (o registro de reserva ativa
    // deste aluno), e só um dos dois consegue gravá-la primeiro.
    const INFLIGHT_TTL_MS = 2 * 60 * 1000
    let claimedNow = false
    if (!isAdmin) {
      const claimEntry = await claimStore.getWithMetadata(email, { type: 'json' })
      const claim = claimEntry?.data as ActiveBookingClaim | undefined

      if (claim) {
        // `date` preenchida e futura = reserva ativa de verdade.
        const reservaFutura = claim.date !== '' && claim.date >= today
        // `date` vazia = OUTRO pedido deste aluno está no meio do caminho
        // agora. Só é considerado abandonado (e substituível) se ficou preso
        // por mais de 2 min — nesse caso o pedido anterior travou no meio.
        const emAndamento = claim.date === '' && Date.now() - Date.parse(claim.claimedAt) < INFLIGHT_TTL_MS
        if (reservaFutura || emAndamento) {
          throw new Error('Você já tem uma mentoria individual marcada. Cancele-a antes de marcar outro horário.')
        }
        // Sobra: reserva passada nunca cancelada, ou tentativa abandonada —
        // pode ser substituída (via CAS logo abaixo).
      }

      const newClaim: ActiveBookingClaim = { slotId: data.id, date: '', claimedAt: new Date().toISOString() }
      const claimResult = claimEntry
        ? await claimStore.setJSON(email, newClaim, { onlyIfMatch: claimEntry.etag })
        : await claimStore.setJSON(email, newClaim, { onlyIfNew: true })

      if (!claimResult?.modified) {
        // Perdeu a corrida: outro pedido (do mesmo aluno, quase no mesmo
        // instante) gravou a reserva ativa primeiro.
        throw new Error('Você já tem uma mentoria individual marcada. Cancele-a antes de marcar outro horário.')
      }
      claimedNow = true
    }

    try {
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
        student: { email, name: studentName },
      }

      // onlyIfMatch garante que, se dois alunos clicarem quase ao mesmo tempo,
      // só o primeiro consegue — o segundo recebe um erro em vez de sobrescrever.
      const result = await store.setJSON(data.id, updated, { onlyIfMatch: entry.etag })
      if (!result?.modified) {
        throw new Error('Esse horário acabou de ser reservado por outro aluno. Escolha outro.')
      }

      // Agora que o horário está mesmo reservado, grava a data real na trava
      // (antes ficava em branco só pra reservar a chave — ver acima).
      if (!isAdmin) {
        const claimEntry = await claimStore.getWithMetadata(email, { type: 'json' })
        if (claimEntry) {
          await claimStore.setJSON(
            email,
            { slotId: data.id, date: slot.date, claimedAt: (claimEntry.data as ActiveBookingClaim).claimedAt },
            { onlyIfMatch: claimEntry.etag },
          )
        }
      }

      // Só depois da reserva gravada. `notificarAgendamento` nunca lança: se o
      // e-mail falhar, o aluno continua com o horário marcado.
      await notificarAgendamento({
        nomeAluno: studentName,
        emailAluno: email,
        data: slot.date,
        hora: slot.time,
        duracao: slot.duration,
        emGrupo: false,
      })

      return updated
    } catch (error) {
      // O slot não foi reservado (já pego por outro aluno, sumiu, etc.) —
      // libera a trava que este pedido tinha acabado de criar, senão o aluno
      // fica bloqueado de tentar outro horário sem ter reservado nada.
      if (claimedNow) {
        try {
          await claimStore.delete(email)
        } catch {
          // limpeza best-effort: se falhar, o próximo `bookMentoriaSlot` deste
          // aluno vê a trava com `date: ''` (< today) e a substitui sozinho.
        }
      }
      throw error
    }
  })

export const cancelMentoriaSlot = createServerFn({ method: 'POST' })
  .validator(z.object({ id: idSchema }))
  .handler(async ({ data }) => {
    const user = await getServerUser()
    if (!user) throw new Error('Você precisa estar logado.')
    await assertActiveSession(user)

    const isAdmin = userHasRole(user, 'admin')
    if (!isAdmin) await enforceRateLimit(AGENDAMENTO_RATE_LIMIT, user.email ?? '')

    const store = slotsStore()
    const entry = await store.getWithMetadata(data.id, { type: 'json' })
    if (!entry) throw new Error('Esse horário não existe mais.')

    const slot = entry.data as MentoriaSlot
    if (slot.student?.email !== user.email && !isAdmin) {
      throw new Error('Você só pode cancelar os seus próprios horários.')
    }

    const updated: MentoriaSlot = { ...slot, status: 'available', student: null }
    const result = await store.setJSON(data.id, updated, { onlyIfMatch: entry.etag })
    if (!result?.modified) throw new Error('Não foi possível cancelar, tente novamente.')

    // Libera a trava de "uma mentoria futura por aluno" do dono original do
    // horário (não de quem cancelou — pode ter sido a professora cancelando
    // pelo aluno).
    if (slot.student?.email) {
      try {
        await activeBookingStore().delete(slot.student.email)
      } catch {
        // limpeza best-effort — não impede o cancelamento em si
      }
    }

    return updated
  })
