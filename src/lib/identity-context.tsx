import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { getUser, logout as identityLogout, onAuthChange, type User } from '@netlify/identity'

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
    getUser().then((currentUser) => {
      setUser(currentUser)
      setReady(true)
    })
    return onAuthChange((_event, currentUser) => setUser(currentUser))
  }, [])

  const logout = async () => {
    await identityLogout()
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
