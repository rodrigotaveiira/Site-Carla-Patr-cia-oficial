import { useLayoutEffect, useState, type ReactNode } from 'react'
import { handleAuthCallback } from '@netlify/identity'

const AUTH_HASH_PATTERN =
  /^#(confirmation_token|recovery_token|invite_token|email_change_token|access_token)=/

// Captura o hash da URL assim que este módulo é carregado pelo navegador,
// antes que qualquer navegação/roteamento tenha chance de limpá-lo.
const capturedHash = typeof window !== 'undefined' ? window.location.hash : ''

export function CallbackHandler({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle')
  const [errorDetail, setErrorDetail] = useState<string>('')

  useLayoutEffect(() => {
    if (!AUTH_HASH_PATTERN.test(capturedHash)) return

    setStatus('processing')
    handleAuthCallback()
      .then((result) => {
        setStatus(result ? 'success' : 'error')
        if (!result) setErrorDetail('handleAuthCallback retornou vazio (sem resultado)')
      })
      .catch((err) => {
        setStatus('error')
        setErrorDetail(err instanceof Error ? err.message : String(err))
      })
  }, [])

  if (status === 'processing' || status === 'success' || status === 'error') {
    return (
      <div style={{ maxWidth: 480, margin: '120px auto', padding: '0 24px', textAlign: 'center', fontFamily: 'sans-serif' }}>
        {status === 'processing' && <p>Confirmando sua conta, aguarde...</p>}
        {status === 'success' && <p style={{ color: '#16a34a', fontWeight: 700 }}>Conta confirmada com sucesso! Você já pode fechar esta mensagem e entrar na plataforma normalmente.</p>}
        {status === 'error' && (
          <div>
            <p style={{ color: '#dc2626', fontWeight: 700 }}>Não foi possível confirmar automaticamente.</p>
            <pre style={{ textAlign: 'left', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 12, marginTop: 12, fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {errorDetail}
            </pre>
          </div>
        )}
      </div>
    )
  }

  return children
}