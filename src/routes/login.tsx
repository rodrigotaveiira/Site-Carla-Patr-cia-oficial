import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { AuthError, login, signup } from '@netlify/identity'
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, GraduationCap, LockKeyhole, Mail, Sparkles } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { loginLocalUser, registerLocalUser } from '@/lib/identity-context'
import { noindexHead } from '@/lib/seo'

export const Route = createFileRoute('/login')({ head: noindexHead, component: LoginPage })

function LoginPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(() =>
    (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('reason') === 'other-device')
      ? 'Sua conta foi acessada em outro aparelho, então você foi desconectado(a) aqui. Só é possível usar a conta em um aparelho por vez.'
      : '',
  )
  const [notice, setNotice] = useState('')

  const isLocalDemoMode = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    setNotice('')
    const data = new FormData(event.currentTarget)
    const email = String(data.get('email') || '').trim()
    const password = String(data.get('password') || '')
    const name = String(data.get('name') || 'Aluno').trim()
    const cpf = String(data.get('cpf') || '').trim()

    try {
      if (isLocalDemoMode) {
        if (mode === 'signup') {
          if (!name || !cpf || !email || password.length < 6) {
            setError('Preencha nome, CPF, e-mail e senha com pelo menos 6 caracteres.')
            return
          }

          const registered = registerLocalUser({ name, cpf, email, password })
          if (!registered) {
            setError('Já existe uma conta para este e-mail. Faça login ou use outro endereço.')
            return
          }

          setNotice('Conta criada com sucesso. Redirecionando...')
          await navigate({ to: '/dashboard' })
          return
        }

        const localUser = loginLocalUser(email, password)
        if (!localUser) {
          setError('E-mail ou senha inválidos no ambiente local. Crie a conta primeiro.')
          return
        }

        await navigate({ to: '/dashboard' })
        return
      }

      if (mode === 'signup') {
        const user = await signup(email, password, { full_name: name, cpf })
        if (!user.confirmedAt) {
          setNotice('Cadastro realizado. Confirme o link enviado para o seu e-mail.')
          return
        }
      } else {
        await login(email, password)
      }
      await navigate({ to: '/dashboard' })
    } catch (caughtError) {
      const message = caughtError instanceof AuthError ? caughtError.message : 'Não foi possível acessar. Tente novamente.'
      if (isLocalDemoMode && mode === 'signup') {
        const registered = registerLocalUser({ name, cpf, email, password })
        if (!registered) {
          setError('Já existe uma conta para este e-mail. Faça login ou use outro endereço.')
          return
        }
        setNotice('Ambiente local sem Netlify Identity configurado. Conta criada localmente para uso de teste.')
        await navigate({ to: '/dashboard' })
        return
      }
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-panel brand-panel">
        <Link className="back-home" to="/"><ArrowLeft size={17} /> Voltar ao site</Link>
        <div className="login-brand"><span className="brand-mark">CP</span><div><b>Carla Patrícia</b><small>Redação · Gramática</small></div></div>
        <div className="brand-panel-copy"><span className="pill"><Sparkles size={14} /> Espaço do aluno</span><h1>Seu conhecimento.<br /><em>Sua conquista.</em></h1><p>Organize seus estudos, acompanhe sua evolução e mantenha sua aprovação sempre à vista.</p></div>
        <div className="login-benefits"><span><Check /> Conteúdo organizado em trilhas</span><span><Check /> Correções e feedbacks em um só lugar</span><span><Check /> Acompanhamento completo da evolução</span></div>
        <div className="login-quote"><p>“A constância transforma o que parece distante em uma conquista possível.”</p><span>Carla Patrícia Medina</span></div>
      </section>

      <section className="login-panel form-panel">
        <div className="login-form-wrap">
          <div className="mobile-login-brand"><GraduationCap /> CPM Educação</div>
          <div className="login-heading"><span>Bem-vindo(a)</span><h2>{mode === 'login' ? 'Continue sua jornada.' : 'Comece sua jornada.'}</h2><p>{mode === 'login' ? 'Acesse sua conta para continuar seus estudos.' : 'Crie sua conta para acessar a plataforma.'}</p></div>
          <div className="auth-tabs"><button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Entrar</button><button className={mode === 'signup' ? 'active' : ''} onClick={() => setMode('signup')}>Criar conta</button></div>
          <form className="login-form" onSubmit={handleSubmit}>
            {mode === 'signup' && (
              <>
                <label>Nome completo<div className="input-icon"><GraduationCap /><input name="name" placeholder="Seu nome completo" required /></div></label>
                <label>CPF<div className="input-icon"><GraduationCap /><input name="cpf" placeholder="000.000.000-00" inputMode="numeric" required /></div></label>
              </>
            )}
            <label>E-mail<div className="input-icon"><Mail /><input type="email" name="email" placeholder="voce@email.com" required /></div></label>
            <label>Senha<div className="input-icon"><LockKeyhole /><input type={showPassword ? 'text' : 'password'} name="password" placeholder="Mínimo de 6 caracteres" minLength={6} required /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label="Mostrar senha">{showPassword ? <EyeOff /> : <Eye />}</button></div></label>
            {mode === 'login' && <div className="login-options"><label><input type="checkbox" /> Lembrar de mim</label><button type="button">Esqueci minha senha</button></div>}
            {error && <p className="form-message error">{error}</p>}{notice && <p className="form-message success">{notice}</p>}
            <button className="button login-submit" disabled={loading}>{loading ? 'Aguarde...' : mode === 'login' ? 'Entrar na plataforma' : 'Criar minha conta'} <ArrowRight size={17} /></button>
          </form>
          <div className="login-support">Precisa de ajuda? <a href="mailto:contato@carlapatriciamedina.com.br">Fale com o suporte</a></div>
        </div>
      </section>
    </main>
  )
}
