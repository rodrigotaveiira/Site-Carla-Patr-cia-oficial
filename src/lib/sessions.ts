import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getStore } from '@netlify/blobs'
import { getServerUser } from './auth'
import { userHasRole, isStaff } from './roles'
import { setDeviceSessionCookie } from './session-guard.server'

export type SessionRecord = {
  sessionId: string
  device: string
  loginAt: string
}

export type StudentSessionHistory = {
  email: string
  name: string
  history: SessionRecord[] // mais recente primeiro; o [0] é o aparelho atualmente ativo
}

const MAX_HISTORY = 20

// Guarda só qual sessão está ativa agora, por aluno — usado pra derrubar a
// sessão antiga assim que um login novo acontece em outro aparelho.
function activeSessionsStore() {
  return getStore({ name: 'active-sessions', consistency: 'strong' })
}

// Histórico de logins por aluno, pra a professora acompanhar no painel admin.
function sessionHistoryStore() {
  return getStore({ name: 'session-history', consistency: 'strong' })
}

function studentDisplayName(user: unknown) {
  const u = user as Record<string, any>
  return u?.name || u?.user_metadata?.full_name || u?.userMetadata?.full_name || 'Aluno'
}

// Chamado no login (ou quando o app percebe que ainda não tem uma sessão
// registrada neste aparelho). Vira a sessão ativa da conta, derrubando
// qualquer outro aparelho já logado. Só se aplica a alunos — a equipe
// (admin/professor) pode usar vários aparelhos ao mesmo tempo.
export const registerLogin = createServerFn({ method: 'POST' })
  .validator(z.object({ device: z.string().trim().max(200) }))
  .handler(async ({ data }) => {
    const user = await getServerUser()
    if (!user || !user.email) throw new Error('Você precisa estar logado.')
    if (isStaff(user)) return { sessionId: null, tracked: false }

    const email = user.email
    const sessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    const loginAt = new Date().toISOString()

    await activeSessionsStore().setJSON(email, { email, sessionId, loginAt })

    const historyStore = sessionHistoryStore()
    const existing = await historyStore.get(email, { type: 'json' }) as StudentSessionHistory | null
    const history = [{ sessionId, device: data.device, loginAt }, ...(existing?.history ?? [])].slice(0, MAX_HISTORY)
    await historyStore.setJSON(email, { email, name: studentDisplayName(user), history })

    setDeviceSessionCookie(sessionId)

    return { sessionId, tracked: true }
  })

// Checado periodicamente pelo app: se a sessão que este aparelho guarda não
// bate mais com a sessão ativa da conta, é porque outro aparelho logou depois.
export const checkSessionActive = createServerFn({ method: 'POST' })
  .validator(z.object({ sessionId: z.string().trim().min(1).max(200) }))
  .handler(async ({ data }) => {
    const user = await getServerUser()
    if (!user || !user.email) return { active: false }
    if (isStaff(user)) return { active: true } // equipe não é restrita a um aparelho só

    const active = await activeSessionsStore().get(user.email, { type: 'json' }) as { sessionId: string } | null
    return { active: active?.sessionId === data.sessionId }
  })

export const listAllSessionHistories = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await getServerUser()
  if (!user || !userHasRole(user, 'admin')) throw new Error('Acesso negado.')

  const store = sessionHistoryStore()
  const { blobs } = await store.list()
  const all: StudentSessionHistory[] = []
  for (const blob of blobs) {
    const value = await store.get(blob.key, { type: 'json' })
    if (value) all.push(value as StudentSessionHistory)
  }
  all.sort((a, b) => (b.history[0]?.loginAt ?? '').localeCompare(a.history[0]?.loginAt ?? ''))
  return all
})
