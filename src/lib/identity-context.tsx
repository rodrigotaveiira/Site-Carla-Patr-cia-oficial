import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { getUser, logout as identityLogout, onAuthChange, updateUser as identityUpdateUser, type User } from '@netlify/identity'
import { describeDevice } from './device'
import { checkSessionActive, registerLogin } from './sessions'
import { isStaff } from './roles'

const LOCAL_USERS_KEY = 'cpm-local-users'
const LOCAL_SESSION_KEY = 'cpm-local-user'
const DEVICE_SESSION_KEY = 'cpm:device-session-id'
const SESSION_CHECK_INTERVAL_MS = 25_000

type LocalUser = User & {
  password?: string
  cpf?: string
  user_metadata?: {
    full_name?: string
    cpf?: string
  }
}

export function readLocalUsers(): LocalUser[] {
  if (typeof window === 'undefined') return []

  const stored = window.localStorage.getItem(LOCAL_USERS_KEY)
  if (!stored) return []

  try {
    const parsed = JSON.parse(stored)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function getLocalUserSession(): User | null {
  if (typeof window === 'undefined') return null

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

export function createLocalUserRecord(data: {
  name: string
  cpf: string
  email: string
  password: string
}): LocalUser {
  return {
    id: crypto.randomUUID(),
    email: data.email,
    password: data.password,
    cpf: data.cpf,
    user_metadata: { full_name: data.name, cpf: data.cpf },
    confirmed_at: new Date().toISOString(),
  } as LocalUser
}

export function registerLocalUser(data: { name: string; cpf: string; email: string; password: string }) {
  if (typeof window === 'undefined') return null

  const users = readLocalUsers()
  const exists = users.some((user) => user.email?.toLowerCase() === data.email.toLowerCase())
  if (exists) return null

  const newUser = createLocalUserRecord(data)
  users.push(newUser)
  window.localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users))
  window.localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(newUser))
  return newUser
}

export function loginLocalUser(email: string, password: string) {
  if (typeof window === 'undefined') return null

  const users = readLocalUsers()
  const match = users.find((user) => user.email?.toLowerCase() === email.toLowerCase() && user.password === password)
  if (!match) return null

  window.localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(match))
  return match as User
}

export function storeLocalUser(user: Partial<User>) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(user))
}

export function clearLocalUser() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(LOCAL_SESSION_KEY)
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

  useEffect(() => {
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
