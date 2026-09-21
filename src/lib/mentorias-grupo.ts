import { createServerFn } from '@tanstack/react-start'
import { getStore } from '@netlify/blobs'
import { getServerUser } from './auth'
import { userHasRole } from './roles'
import { STORES } from './blob-stores'
import { notificarAgendamento } from './notificar-agendamento'
import { registrarAgendamentoGrupoNaPlanilha } from './planilha-agendamento'
import { notificarMentoriaAlterada, notificarMentoriaCancelada, notificarNovaMentoria } from './notificar-mentoria'
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

type ActiveGroupBookingClaim = { slotId: string; date: string; claimedAt: string }

// Um registro por aluno (no máximo um) com o grupo de mentoria futuro em que
// está inscrito agora. Existe só pra tornar atômica a regra "um grupo futuro
// por aluno" — mesmo padrão de `mentoriaAtiva` em mentorias.ts (mentoria
// individual): sem isso, dois pedidos concorrentes do MESMO aluno pra DOIS
// grupos diferentes passariam os dois (ler-então-agir em chaves diferentes é
// corrida clássica). Aqui os dois disputam a mesma chave, e só um grava primeiro.
function activeGroupBookingStore() {
  return getStore({ name: STORES.mentoriaGrupoAtiva, consistency: 'strong' })
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

    // Só depois do grupo gravado, e nunca lança — ver notificar-mentoria.ts.
    await notificarNovaMentoria({
      emGrupo: true,
      data: slot.date,
      hora: slot.time,
      horaFim: slot.endTime,
      titulo: slot.title,
      descricao: slot.description,
    })

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

    // Avisa só quem já está inscrito, e só quando mudou algo que a pessoa
    // precisa reagendar na cabeça dela: horário, término ou título. Mexer na
    // capacidade ou na descrição não muda onde nem quando ela precisa estar,
    // então não vira e-mail — aviso demais treina o aluno a ignorar todos.
    const mudouOQueImporta =
      slot.time !== updated.time || slot.endTime !== updated.endTime || slot.title !== updated.title

    if (mudouOQueImporta && updated.students.length > 0) {
      await notificarMentoriaAlterada({
        alunos: updated.students,
        emGrupo: true,
        data: updated.date,
        horaAntes: slot.time,
        horaFimAntes: slot.endTime,
        tituloAntes: slot.title,
        horaDepois: updated.time,
        horaFimDepois: updated.endTime,
        tituloDepois: updated.title,
      })
    }

    return updated
  })

export const deleteMentoriaGrupoSlot = createServerFn({ method: 'POST' })
  .validator(z.object({ id: idSchema }))
  .handler(async ({ data }) => {
    const user = await getServerUser()
    if (!user || !userHasRole(user, 'admin')) throw new Error('Acesso negado.')

    const store = slotsStore()
    // Lê antes de apagar pra saber quem estava inscrito: cada um precisa ter a
    // trava de "um grupo por vez" liberada — sem isso, todo mundo que estava
    // nesse grupo ficaria impedido de entrar em outro até a data do grupo
    // apagado passar sozinha (a trava só expira pela data, ver joinMentoriaGrupoSlot).
    const existing = (await store.get(data.id, { type: 'json' })) as MentoriaGrupoSlot | null
    await store.delete(data.id)

    if (existing?.students?.length) {
      const claimStore = activeGroupBookingStore()
      await Promise.all(existing.students.map(async (student) => {
        try {
          await claimStore.delete(student.email)
        } catch {
          // limpeza best-effort — não impede a exclusão do grupo em si
        }
      }))

      // Todo mundo que estava inscrito precisa saber que não vai acontecer.
      await notificarMentoriaCancelada({
        alunos: existing.students,
        emGrupo: true,
        data: existing.date,
        hora: existing.time,
        horaFim: existing.endTime,
        titulo: existing.title,
      })
    }

    return { ok: true }
  })

export const joinMentoriaGrupoSlot = createServerFn({ method: 'POST' })
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
    const claimStore = activeGroupBookingStore()
    const today = new Date().toISOString().slice(0, 10)

    // Cada aluno só pode estar em um grupo de mentoria futuro por vez — mesma
    // regra e mesmo motivo da mentoria individual (ver bookMentoriaSlot em
    // mentorias.ts). Admin fica isento, pra poder testar um grupo sem que isso
    // conte como "vaga ocupada" de verdade.
    const INFLIGHT_TTL_MS = 2 * 60 * 1000
    let claimedNow = false
    if (!isAdmin) {
      const claimEntry = await claimStore.getWithMetadata(email, { type: 'json' })
      const claim = claimEntry?.data as ActiveGroupBookingClaim | undefined

      if (claim) {
        // `date` preenchida e futura = inscrição ativa de verdade.
        const inscricaoFutura = claim.date !== '' && claim.date >= today
        // `date` vazia = outro pedido deste aluno está no meio do caminho
        // agora. Só é considerado abandonado (e substituível) se ficou preso
        // por mais de 2 min.
        const emAndamento = claim.date === '' && Date.now() - Date.parse(claim.claimedAt) < INFLIGHT_TTL_MS
        if (inscricaoFutura || emAndamento) {
          throw new Error('Você já está inscrito em outro grupo de mentoria. Saia dele antes de entrar em outro.')
        }
        // Sobra: inscrição passada nunca finalizada (saiu, ou o grupo foi
        // apagado), ou tentativa abandonada — pode ser substituída (CAS abaixo).
      }

      const newClaim: ActiveGroupBookingClaim = { slotId: data.id, date: '', claimedAt: new Date().toISOString() }
      const claimResult = claimEntry
        ? await claimStore.setJSON(email, newClaim, { onlyIfMatch: claimEntry.etag })
        : await claimStore.setJSON(email, newClaim, { onlyIfNew: true })

      if (!claimResult?.modified) {
        // Perdeu a corrida: outro pedido (do mesmo aluno, quase no mesmo
        // instante) gravou a inscrição ativa primeiro.
        throw new Error('Você já está inscrito em outro grupo de mentoria. Saia dele antes de entrar em outro.')
      }
      claimedNow = true
    }

    try {
      const entry = await store.getWithMetadata(data.id, { type: 'json' })
      if (!entry) throw new Error('Esse grupo não existe mais. Atualize a página.')

      const slot = entry.data as MentoriaGrupoSlot
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

      // Agora que a entrada está mesmo gravada, grava a data real na trava
      // (antes ficava em branco só pra reservar a chave — ver acima).
      if (!isAdmin) {
        const claimEntry = await claimStore.getWithMetadata(email, { type: 'json' })
        if (claimEntry) {
          await claimStore.setJSON(
            email,
            { slotId: data.id, date: slot.date, claimedAt: (claimEntry.data as ActiveGroupBookingClaim).claimedAt },
            { onlyIfMatch: claimEntry.etag },
          )
        }
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
      // Mesma lógica: `registrarAgendamentoGrupoNaPlanilha` também nunca lança.
      await registrarAgendamentoGrupoNaPlanilha({
        nomeAluno: studentName,
        data: slot.date,
        hora: slot.time,
        totalInscritos: updated.students.length,
      })

      return updated
    } catch (error) {
      // A entrada não foi gravada (grupo sumiu, lotou, etc.) — libera a trava
      // que este pedido tinha acabado de criar, senão o aluno fica bloqueado
      // de tentar outro grupo sem ter entrado em nenhum.
      if (claimedNow) {
        try {
          await claimStore.delete(email)
        } catch {
          // limpeza best-effort: se falhar, o próximo `joinMentoriaGrupoSlot`
          // deste aluno vê a trava com `date: ''` (< today) e a substitui sozinho.
        }
      }
      throw error
    }
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

    // Libera a trava de "um grupo por vez" de quem saiu — mesmo padrão do
    // cancelMentoriaSlot da mentoria individual. Só libera se quem saiu foi o
    // próprio aluno (a remoção acima só tira `user.email`; admin sem ser
    // membro do grupo não tira ninguém, então não há trava de terceiro a liberar).
    if (alreadyIn) {
      try {
        await activeGroupBookingStore().delete(user.email ?? '')
      } catch {
        // limpeza best-effort — não impede a saída em si
      }
    }

    return updated
  })

// Tira UM aluno específico do grupo, sem apagar o grupo — diferente de
// deleteMentoriaGrupoSlot (apaga o grupo inteiro, com todo mundo dentro) e de
// leaveMentoriaGrupoSlot (só o próprio aluno consegue sair). Só admin: é a
// professora removendo alguém, não o aluno saindo por conta própria.
export const removeMentoriaGrupoStudent = createServerFn({ method: 'POST' })
  .validator(z.object({ id: idSchema, email: z.string().trim().email().max(200) }))
  .handler(async ({ data }) => {
    const user = await getServerUser()
    if (!user || !userHasRole(user, 'admin')) throw new Error('Acesso negado.')

    const store = slotsStore()
    const entry = await store.getWithMetadata(data.id, { type: 'json' })
    if (!entry) throw new Error('Esse grupo não existe mais. Atualize a página.')

    const slot = entry.data as MentoriaGrupoSlot
    if (!slot.students.some((student) => student.email === data.email)) {
      throw new Error('Esse aluno não está nesse grupo. Atualize a página.')
    }

    const updated: MentoriaGrupoSlot = {
      ...slot,
      students: slot.students.filter((student) => student.email !== data.email),
    }
    const result = await store.setJSON(data.id, updated, { onlyIfMatch: entry.etag })
    if (!result?.modified) throw new Error('Não foi possível remover, tente novamente.')

    // Libera a trava de "um grupo por vez" do aluno removido — mesmo padrão
    // de leaveMentoriaGrupoSlot. Sem isso ele ficaria impedido de entrar em
    // outro grupo até a data deste passar sozinha.
    try {
      await activeGroupBookingStore().delete(data.email)
    } catch {
      // limpeza best-effort — não impede a remoção em si
    }

    // Só pro aluno removido: pra ele o grupo deixou de existir, e ninguém mais
    // precisa saber. O grupo em si continua acontecendo pros outros.
    const removido = slot.students.find((student) => student.email === data.email)
    if (removido) {
      await notificarMentoriaCancelada({
        alunos: [removido],
        emGrupo: true,
        data: slot.date,
        hora: slot.time,
        horaFim: slot.endTime,
        titulo: slot.title,
      })
    }

    return updated
  })
