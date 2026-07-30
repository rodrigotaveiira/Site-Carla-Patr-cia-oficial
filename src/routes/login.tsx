import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { AuthError, login, signup } from '@netlify/identity'
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, GraduationCap, LockKeyhole, Mail, Sparkles } from 'lucide-react'
import { useState, type FormEvent } from 'react'

export const Route = createFileRoute('/login')({ component: LoginPage })

function LoginPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    setNotice('')
    const data = new FormData(event.currentTarget)
    const email = String(data.get('email'))
    const password = String(data.get('password'))
    const name = String(data.get('name') || '')

    try {
      if (mode === 'signup') {
        const user = await signup(email, password, { full_name: name })
        if (!user.confirmedAt) {
          setNotice('Cadastro realizado. Confirme o link enviado para o seu e-mail.')
          return
        }
      } else {
        await login(email, password)
      }
      await navigate({ to: '/dashboard' })
    } catch (caughtError) {
      setError(caughtError instanceof AuthError ? caughtError.message : 'Não foi possível acessar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-panel brand-panel">
        <Link className="back-home" to="/"><ArrowLeft size={17} /> Voltar ao site</Link>
        <div className="login-brand"><span className="brand-mark">CP</span><div><b>Carla Patrícia</b><small>Medina · Educação</small></div></div>
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
            {mode === 'signup' && <label>Nome completo<div className="input-icon"><GraduationCap /><input name="name" placeholder="Seu nome completo" required /></div></label>}
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
