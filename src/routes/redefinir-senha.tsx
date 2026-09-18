import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { AuthError, recoverPassword } from '@netlify/identity'
import { ArrowRight, Eye, EyeOff, LinkIcon, LockKeyhole } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { AuthLayout } from '@/components/AuthLayout'
import { clearRecoveryToken, readRecoveryToken } from '@/lib/recovery-token'
import { noindexHead } from '@/lib/seo'

export const Route = createFileRoute('/redefinir-senha')({ head: noindexHead, component: RedefinirSenhaPage })

const SENHA_MINIMA = 6

function RedefinirSenhaPage() {
  const navigate = useNavigate()
  // Lido uma vez só, na montagem: o `CallbackHandler` já guardou o token antes
  // de esta tela existir, e depois do envio ele é apagado — reler a cada render
  // faria o formulário sumir no meio do próprio sucesso.
  const [token] = useState(readRecoveryToken)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!token) return

    const data = new FormData(event.currentTarget)
    const password = String(data.get('password') || '')
    const confirmation = String(data.get('confirmation') || '')

    if (password.length < SENHA_MINIMA) {
      setError(`A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.`)
      return
    }

    if (password !== confirmation) {
      setError('As duas senhas não são iguais. Confira e tente de novo.')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Só aqui o token é gasto. Em troca dele a senha nova é gravada e a
      // sessão começa — por isso o aluno já cai logado no painel.
      await recoverPassword(token, password)
      clearRecoveryToken()
      await navigate({ to: '/dashboard' })
    } catch (caughtError) {
      const status = caughtError instanceof AuthError ? caughtError.status : undefined
      setError(
        status === 401 || status === 404 || status === 422
          ? 'Este link de recuperação não vale mais (ele expira e só pode ser usado uma vez). Peça um novo link para continuar.'
          : 'Não foi possível salvar a senha nova agora. Tente de novo em alguns minutos.',
      )
      setLoading(false)
    }
  }

  // Sem token não há o que redefinir: é quem abriu o endereço direto, ou
  // recarregou a página numa aba nova, ou o link já foi usado.
  if (!token) {
    return (
      <AuthLayout>
        <div className="login-heading">
          <span>Recuperar acesso</span>
          <h2>Link inválido.</h2>
          <p>Abra a página pelo link mais recente que enviamos por e-mail — ele expira e só funciona uma vez.</p>
        </div>

        <div className="auth-confirm">
          <span className="auth-confirm-icon"><LinkIcon /></span>
          <b>Peça um link novo</b>
          <p>Leva menos de um minuto: informe seu e-mail de novo e enviamos outro link para criar a senha.</p>
          <Link className="button login-submit" to="/esqueci-senha">Pedir novo link <ArrowRight size={17} /></Link>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <div className="login-heading">
        <span>Recuperar acesso</span>
        <h2>Crie uma senha nova.</h2>
        <p>Escolha a senha que você vai usar a partir de agora para entrar na plataforma.</p>
      </div>

      <form className="login-form" onSubmit={handleSubmit}>
        <label>Nova senha<div className="input-icon"><LockKeyhole /><input type={showPassword ? 'text' : 'password'} name="password" placeholder={`Mínimo de ${SENHA_MINIMA} caracteres`} minLength={SENHA_MINIMA} autoComplete="new-password" required /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label="Mostrar senha">{showPassword ? <EyeOff /> : <Eye />}</button></div></label>
        <label>Confirmar nova senha<div className="input-icon"><LockKeyhole /><input type={showPassword ? 'text' : 'password'} name="confirmation" placeholder="Digite a senha de novo" minLength={SENHA_MINIMA} autoComplete="new-password" required /></div></label>
        {error && <p className="form-message error">{error}</p>}
        <button className="button login-submit" disabled={loading}>{loading ? 'Salvando...' : 'Salvar e entrar'} <ArrowRight size={17} /></button>
      </form>
    </AuthLayout>
  )
}
