import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { getUser, logout as identityLogout, onAuthChange, type User } from '@netlify/identity'

const LOCAL_USERS_KEY = 'cpm-local-users'
const LOCAL_SESSION_KEY = 'cpm-local-user'

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
}

const IdentityContext = createContext<IdentityContextValue | null>(null)

export function IdentityProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const localUser = readLocalUser()
    if (localUser) {
      setUser(localUser)
      setReady(true)
      return
    }

    getUser().then((currentUser) => {
      setUser(currentUser)
      setReady(true)
    })

    return onAuthChange((_event, currentUser) => setUser(currentUser))
  }, [])

  const logout = async () => {
    try {
      await identityLogout()
    } catch {
      // ignore, fallback local user may be enough for local dev
    }
    clearLocalUser()
    setUser(null)
  }

  return (
    <IdentityContext.Provider value={{ user, ready, logout }}>
      {children}
    </IdentityContext.Provider>
  )
}

export function useIdentity() {
  const context = useContext(IdentityContext)
  if (!context) throw new Error('useIdentity must be used within IdentityProvider')
  return context
}
