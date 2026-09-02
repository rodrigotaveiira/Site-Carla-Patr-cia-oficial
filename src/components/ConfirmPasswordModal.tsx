import { Eye, EyeOff, LockKeyhole, X } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'

type Props = {
  /** O que esta sendo confirmado, ex.: "Terça, 12 de março às 14:00". */
  detail: string
  confirmLabel: string
  onConfirm: (password: string) => Promise<void>
  onCancel: () => void
}

// Pede a senha da conta antes de confirmar um agendamento. O componente cuida do
// campo, do estado de carregando e da mensagem de erro; quem chama so recebe a
// senha digitada e lanca um Error com a mensagem se algo der errado.
export function ConfirmPasswordModal({ detail, confirmLabel, onConfirm, onCancel }: Props) {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Esc fecha, como em qualquer dialogo — mas nao no meio de uma confirmacao ja
  // enviada, senao o aluno fecha sem saber se marcou ou nao.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !loading) onCancel()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [loading, onCancel])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!password) {
      setError('Digite sua senha para confirmar.')
      return
    }

    setError('')
    setLoading(true)
    try {
      await onConfirm(password)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível confirmar. Tente novamente.')
      setPassword('')
      inputRef.current?.focus()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="onboarding-overlay" role="dialog" aria-modal="true" aria-labelledby="confirm-password-title">
      <div className="confirm-password-modal">
        <button
          type="button"
          className="month-review-close"
          onClick={onCancel}
          disabled={loading}
          aria-label="Fechar"
        >
          <X size={15} />
        </button>

        <div className="confirm-password-header">
          <span className="confirm-password-icon"><LockKeyhole size={20} color="#fff" /></span>
          <h2 id="confirm-password-title">Confirme com sua senha</h2>
          <p>Pra garantir que é você marcando, digite a senha da sua conta.</p>
        </div>

        <form className="confirm-password-body" onSubmit={handleSubmit}>
          <div className="confirm-password-detail">{detail}</div>

          <label>
            Senha
            <div className="input-icon">
              <LockKeyhole />
              <input
                ref={inputRef}
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Sua senha de acesso"
                autoComplete="current-password"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </button>
            </div>
          </label>

          {error && <p className="form-error" role="alert">{error}</p>}

          <div className="confirm-password-actions">
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ justifyContent: 'center' }}>
              {loading ? 'Confirmando...' : confirmLabel}
            </button>
            <button type="button" className="onboarding-skip" onClick={onCancel} disabled={loading}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
