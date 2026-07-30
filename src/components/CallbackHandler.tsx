import { useEffect, type ReactNode } from 'react'
import { handleAuthCallback } from '@netlify/identity'

const AUTH_HASH_PATTERN =
  /^#(confirmation_token|recovery_token|invite_token|email_change_token|access_token)=/

export function CallbackHandler({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (AUTH_HASH_PATTERN.test(window.location.hash)) void handleAuthCallback()
  }, [])

  return children
}
