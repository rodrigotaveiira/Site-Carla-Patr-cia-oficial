import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { getUser, logout as identityLogout, onAuthChange, updateUser as identityUpdateUser, type User } from '@netlify/identity'
import { describeDevice } from './device'
import { checkSessionActive, registerLogin } from './sessions'
import { isStaff } from './roles'

const LOCAL_USERS_KEY = 'cpm-local-users'
const LOCAL_SESSION_KEY = 'cpm-local-user'
const DEVICE_SESSION_KEY = 'cpm:device-session-id'
const SESSION_CHECK_INTERVAL_MS = 25_000

// O login/cadastro local (sem Netlify Identity) e uma conveniencia so pra
// desenvolvimento: dados ficticios guardados no localStorage do navegador,
// sem nenhuma validacao de servidor. `import.meta.env.DEV` e uma flag do
// Vite resolvida em BUILD TIME — numa build de producao ela e `false` e o
// bundler elimina este ramo como codigo morto, entao nada aqui roda ou fica
// no bundle publicado. Isso e diferente (e mais forte) do que checar
// `window.location.hostname`, que so depende do que o navegador reporta.
const LOCAL_AUTH_ENABLED = import.meta.env.DEV

type LocalUser = User & {
  passwordHash?: string
  cpf?: string
  user_metadata?: {
    full_name?: string
    cpf?: string
  }
}

// Hash so pra nao guardar a senha em texto puro no localStorage do ambiente
// de dev. NAO e uma barreira de seguranca de verdade (localStorage e sempre
// legivel/gravavel pelo proprio navegador do usuario) — o objetivo unico e
// nao deixar a senha em claro caso alguem abra o DevTools ou o storage seja
// copiado/logado em algum lugar.
async function hashPassword(password: string): Promise<string> {
  const bytes = new TextEncoder().encode(password)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function readLocalUsers(): LocalUser[] {
  if (!LOCAL_AUTH_ENABLED || typeof window === 'undefined') return []

  const stored = window.localStorage.getItem(LOCAL_USERS_KEY)
  if (!stored) return []

  try {
    const parsed = JSON.parse(stored)
    if (!Array.isArray(parsed)) return []
    // Limpa registros antigos que ainda guardavam a senha em texto puro
    // (formato anterior a este hash) — eles nao tem como ser migrados pro
    // hash sem a senha original, entao sao descartados; o aluno de teste
    // local so precisa se cadastrar de novo.
    const clean = parsed.filter((user) => user && typeof user === 'object' && !('password' in user))
    if (clean.length !== parsed.length) {
      window.localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(clean))
    }
    return clean
  } catch {
    return []
  }
}

export function getLocalUserSession(): User | null {
  if (!LOCAL_AUTH_ENABLED || typeof window === 'undefined') return null

  const stored = window.localStorage.getItem(LOCAL_SESSION_KEY)
  if (!stored) return null

  try {
    const parsed = JSON.parse(stored) as Partial<User>
    if (!parsed?.email) return null
    return parsed as User
  } catch {
    return null
  }
}

export function readLocalUser(): User | null {
  return getLocalUserSession()
}

export async function createLocalUserRecord(data: {
  name: string
  cpf: string
  email: string
  password: string
}): Promise<LocalUser> {
  return {
    id: crypto.randomUUID(),
    email: data.email,
    passwordHash: await hashPassword(data.password),
    cpf: data.cpf,
    user_metadata: { full_name: data.name, cpf: data.cpf },
    confirmed_at: new Date().toISOString(),
  } as LocalUser
}

export async function registerLocalUser(data: { name: string; cpf: string; email: string; password: string }) {
  if (!LOCAL_AUTH_ENABLED || typeof window === 'undefined') return null

  const users = readLocalUsers()
  const exists = users.some((user) => user.email?.toLowerCase() === data.email.toLowerCase())
  if (exists) return null

  const newUser = await createLocalUserRecord(data)
  users.push(newUser)
  window.localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users))
  window.localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(newUser))
  return newUser
}

export async function loginLocalUser(email: string, password: string) {
  if (!LOCAL_AUTH_ENABLED || typeof window === 'undefined') return null

  const users = readLocalUsers()
  const hash = await hashPassword(password)
  const match = users.find((user) => user.email?.toLowerCase() === email.toLowerCase() && user.passwordHash === hash)
  if (!match) return null

  window.localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(match))
  return match as User
}

export function storeLocalUser(user: Partial<User>) {
  if (!LOCAL_AUTH_ENABLED || typeof window === 'undefined') return
  window.localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(user))
}

export function clearLocalUser() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(LOCAL_SESSION_KEY)
}

// Se esta build NAO e de desenvolvimento, qualquer `cpm-local-user(s)` que
// ainda exista no navegador (ex.: o mesmo perfil de navegador foi usado
// antes contra um ambiente de dev/preview) e lixo que nao deve ter efeito
// nenhum em produção — apaga de uma vez, sem esperar um login/logout.
function purgeLocalAuthIfDisabled() {
  if (LOCAL_AUTH_ENABLED || typeof window === 'undefined') return
  if (window.localStorage.getItem(LOCAL_SESSION_KEY) || window.localStorage.getItem(LOCAL_USERS_KEY)) {
    window.localStorage.removeItem(LOCAL_SESSION_KEY)
    window.localStorage.removeItem(LOCAL_USERS_KEY)
  }
}

type IdentityContextValue = {
  user: User | null
  ready: boolean
  logout: () => Promise<void>
  kickedOut: boolean
  updateName: (name: string) => Promise<void>
}

const IdentityContext = createContext<IdentityContextValue | null>(null)

// Garante que este aparelho tenha uma sessão registrada pra conta. Se já tem
// (mesmo aparelho, aba nova ou recarregou a página), não faz nada — só um
// login realmente novo (aparelho sem sessão salva) derruba outros aparelhos.
async function ensureSessionTracked() {
  if (typeof window === 'undefined') return
  if (window.localStorage.getItem(DEVICE_SESSION_KEY)) return

  try {
    const result = await registerLogin({ data: { device: describeDevice() } })
    if (result.tracked && result.sessionId) {
      window.localStorage.setItem(DEVICE_SESSION_KEY, result.sessionId)
    }
  } catch {
    // ambiente sem Netlify Identity real (ex.: dev local) — sem sessão pra rastrear
  }
}

export function IdentityProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)
  const [kickedOut, setKickedOut] = useState(false)
  const isLocalUserRef = useRef(false)
  const navigate = useNavigate()

  useEffect(() => {
    purgeLocalAuthIfDisabled()
    const localUser = readLocalUser()
    if (localUser) {
      isLocalUserRef.current = true
      setUser(localUser)
      setReady(true)
      return
    }

    getUser().then((currentUser) => {
      setUser(currentUser)
      setReady(true)
      if (currentUser) void ensureSessionTracked()
    })

    return onAuthChange((_event, currentUser) => {
      setUser(currentUser)
      if (currentUser) void ensureSessionTracked()
    })
  }, [])

  // Confere de tempos em tempos se este ainda é o aparelho ativo da conta.
  // Se outro aparelho fez login depois, esta sessão é derrubada automaticamente.
  useEffect(() => {
    if (!user || isLocalUserRef.current || isStaff(user)) return

    const interval = setInterval(async () => {
      const sessionId = window.localStorage.getItem(DEVICE_SESSION_KEY)
      if (!sessionId) return
      try {
        const { active } = await checkSessionActive({ data: { sessionId } })
        if (!active) {
          window.localStorage.removeItem(DEVICE_SESSION_KEY)
          setKickedOut(true)
          try { await identityLogout() } catch { /* segue mesmo se falhar */ }
          window.location.href = '/login?reason=other-device'
        }
      } catch {
        // sem conexão ou sem Netlify Identity real — não derruba por causa disso
      }
    }, SESSION_CHECK_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [user])

  const updateName = async (name: string) => {
    const trimmed = name.trim()
    if (!trimmed) throw new Error('Digite um nome.')

    if (isLocalUserRef.current) {
      const current = readLocalUser() as LocalUser | null
      if (!current) throw new Error('Você precisa estar logado.')
      const updated: LocalUser = { ...current, name: trimmed, user_metadata: { ...current.user_metadata, full_name: trimmed } }
      storeLocalUser(updated)
      const users = readLocalUsers().map((u) => (u.email === updated.email ? { ...u, user_metadata: { ...u.user_metadata, full_name: trimmed } } : u))
      window.localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users))
      setUser(updated)
      return
    }

    const updated = await identityUpdateUser({ data: { full_name: trimmed } })
    setUser(updated)
  }

  const logout = async () => {
    try {
      await identityLogout()
    } catch {
      // ignore, fallback local user may be enough for local dev
    }
    clearLocalUser()
    window.localStorage.removeItem(DEVICE_SESSION_KEY)
    setUser(null)
    void navigate({ to: '/login' })
  }

  return (
    <IdentityContext.Provider value={{ user, ready, logout, kickedOut, updateName }}>
      {children}
    </IdentityContext.Provider>
  )
}

export function useIdentity() {
  const context = useContext(IdentityContext)
  if (!context) throw new Error('useIdentity must be used within IdentityProvider')
  return context
}
