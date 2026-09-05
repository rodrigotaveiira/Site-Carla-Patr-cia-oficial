import { getCookie, setCookie } from '@tanstack/react-start/server'
import { getStore } from '@netlify/blobs'
import { isStaff } from './roles'

// Só no servidor (`.server.ts`): mexe em cookie de requisição/resposta via
// `@tanstack/react-start/server`, que não pode entrar no bundle do cliente.

// Cookie HttpOnly com a sessão ativa deste aparelho. É o que permite que
// QUALQUER função protegida rejeite uma sessão substituída/revogada no
// servidor — não só o polling de `checkSessionActive` feito pelo navegador.
// HttpOnly porque nada no cliente precisa ler o valor.
const DEVICE_SESSION_COOKIE = 'cpm_device_session'
const DEVICE_SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 180 // 180 dias

function activeSessionsStore() {
  return getStore({ name: 'active-sessions', consistency: 'strong' })
}

/** Grava o cookie da sessão ativa. Chamado dentro do handler de `registerLogin`. */
export function setDeviceSessionCookie(sessionId: string): void {
  setCookie(DEVICE_SESSION_COOKIE, sessionId, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: DEVICE_SESSION_COOKIE_MAX_AGE,
  })
}

/**
 * Barreira de servidor da restrição de um aparelho por conta. Toda função
 * protegida que muda dado do aluno (marcar/cancelar mentoria, enviar redação,
 * recado, etc.) chama isto logo depois de confirmar o login — assim, mesmo
 * que o navegador da sessão antiga pare de rodar o polling (ou a chamada
 * venha direto de fora do app), a ação é rejeitada aqui.
 *
 * Nota de rollout: sessões abertas ANTES deste cookie existir não o têm
 * ainda — `ensureSessionTracked` no cliente só registra login (e por tabela
 * recebe o cookie) quando não existe sessão salva no localStorage. Alunos já
 * logados no momento do deploy vão precisar entrar de novo na primeira ação
 * protegida depois disso; é o custo único e esperado de fechar a brecha.
 */
export async function assertActiveSession(
  user: { email?: string | null } | null | undefined,
): Promise<void> {
  if (!user?.email) return // quem chama já garante login antes de usar isto
  if (isStaff(user)) return // equipe não é restrita a um aparelho só

  const sessionId = getCookie(DEVICE_SESSION_COOKIE)
  if (!sessionId) {
    throw new Error('Sua sessão precisa ser renovada. Atualize a página e entre novamente.')
  }

  const active = (await activeSessionsStore().get(user.email, { type: 'json' })) as { sessionId: string } | null
  if (!active || active.sessionId !== sessionId) {
    throw new Error('Sua conta foi acessada em outro aparelho. Atualize a página e entre novamente.')
  }
}
