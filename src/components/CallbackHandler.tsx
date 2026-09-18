import { useLayoutEffect, useState, type ReactNode } from 'react'
import { handleAuthCallback } from '@netlify/identity'
import { useNavigate } from '@tanstack/react-router'
import { stashRecoveryToken } from '@/lib/recovery-token'

const AUTH_HASH_PATTERN =
  /^#(confirmation_token|invite_token|email_change_token|access_token)=/

// `recovery_token` sai do padrão acima porque tem tratamento próprio: ele é
// desviado pro formulário de senha nova antes de qualquer outra coisa.
const RECOVERY_TOKEN_PATTERN = /[#&]recovery_token=([^&]+)/

// O token vem de uma URL, então pode chegar escapado — e pode chegar torto,
// com um '%' solto que faz o `decodeURIComponent` estourar. Um link estragado
// tem que virar "link inválido" na tela de senha, não uma página em branco.
function decodeToken(raw: string) {
  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
}

// Captura o hash da URL assim que este módulo é carregado pelo navegador,
// antes que qualquer navegação/roteamento tenha chance de limpá-lo.
const capturedHash = typeof window !== 'undefined' ? window.location.hash : ''

export function CallbackHandler({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<'idle' | 'processing' | 'recovery' | 'success' | 'error'>('idle')
  const [errorDetail, setErrorDetail] = useState<string>('')
  const navigate = useNavigate()

  useLayoutEffect(() => {
    const recoveryToken = capturedHash.match(RECOVERY_TOKEN_PATTERN)?.[1]

    if (recoveryToken) {
      // Guarda o token e manda pro formulário de senha nova SEM redimi-lo.
      // Se o `handleAuthCallback` rodasse aqui, o link do e-mail sozinho já
      // abriria uma sessão logada — com a senha antiga ainda valendo e sem
      // nenhuma tela pedindo a troca.
      stashRecoveryToken(decodeToken(recoveryToken))
      // Tira o token da barra de endereço (e do histórico) antes de navegar:
      // ele não precisa mais estar lá e não deve vazar em print, referrer ou
      // num link copiado.
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
      setStatus('recovery')
      void navigate({ to: '/redefinir-senha', replace: true }).finally(() => setStatus('idle'))
      return
    }

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

  if (status !== 'idle') {
    return (
      <div style={{ maxWidth: 480, margin: '120px auto', padding: '0 24px', textAlign: 'center', fontFamily: 'sans-serif' }}>
        {status === 'processing' && <p>Confirmando sua conta, aguarde...</p>}
        {status === 'recovery' && <p>Abrindo a página para você criar uma senha nova...</p>}
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
