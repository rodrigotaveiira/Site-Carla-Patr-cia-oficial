import { createFileRoute, Link } from '@tanstack/react-router'
import { AuthError, requestPasswordRecovery } from '@netlify/identity'
import { ArrowLeft, ArrowRight, Mail, MailCheck } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { AuthLayout } from '@/components/AuthLayout'
import { noindexHead } from '@/lib/seo'

export const Route = createFileRoute('/esqueci-senha')({ head: noindexHead, component: EsqueciSenhaPage })

// A mesma resposta pra e-mail que existe e pra e-mail que não existe. Se a
// tela dissesse "essa conta não existe", qualquer pessoa poderia usar este
// formulário pra descobrir quem é aluno da plataforma, um endereço por vez.
const MENSAGEM_NEUTRA =
  'Se existir uma conta com esse e-mail, o link para criar uma senha nova já está a caminho. Confira também a caixa de spam — o link vale por tempo limitado.'

function EsqueciSenhaPage() {
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError('')

    const email = String(new FormData(event.currentTarget).get('email') || '').trim()

    try {
      await requestPasswordRecovery(email)
      setSent(true)
    } catch (caughtError) {
      // O Identity já responde igual pros dois casos, mas versões que devolvem
      // "não encontrado"/"inválido" abririam a mesma brecha por outro caminho:
      // erro na tela = e-mail sem conta, sucesso = e-mail com conta. Por isso
      // esses dois status também caem na resposta neutra. O preço é que uma
      // configuração quebrada do Identity que devolva 404/422 ficaria silenciosa
      // aqui — mas ela derrubaria o login inteiro junto, e isso ninguém deixa
      // passar despercebido.
      const status = caughtError instanceof AuthError ? caughtError.status : undefined
      if (status === 404 || status === 422) {
        setSent(true)
        return
      }
      setError('Não foi possível enviar o e-mail agora. Tente de novo em alguns minutos.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <div className="login-heading">
        <span>Recuperar acesso</span>
        <h2>Esqueceu a senha?</h2>
        <p>{sent ? 'Pronto — agora é com o seu e-mail.' : 'Informe o e-mail da sua conta e enviamos um link para você criar uma senha nova.'}</p>
      </div>

      {sent ? (
        <div className="auth-confirm">
          <span className="auth-confirm-icon"><MailCheck /></span>
          <b>Verifique seu e-mail</b>
          <p>{MENSAGEM_NEUTRA}</p>
          <Link className="button login-submit" to="/login">Voltar para o login <ArrowRight size={17} /></Link>
        </div>
      ) : (
        <>
          <form className="login-form" onSubmit={handleSubmit}>
            <label>E-mail<div className="input-icon"><Mail /><input type="email" name="email" placeholder="voce@email.com" autoComplete="email" required /></div></label>
            {error && <p className="form-message error">{error}</p>}
            <button className="button login-submit" disabled={loading}>{loading ? 'Enviando...' : 'Enviar link de recuperação'} <ArrowRight size={17} /></button>
          </form>

          <Link className="auth-back-link" to="/login"><ArrowLeft size={15} /> Voltar para o login</Link>
        </>
      )}
    </AuthLayout>
  )
}
