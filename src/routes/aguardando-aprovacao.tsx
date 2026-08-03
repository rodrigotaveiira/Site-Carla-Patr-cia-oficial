import { createFileRoute, Link, useSearch } from '@tanstack/react-router'
import { ShieldCheck } from 'lucide-react'

export const Route = createFileRoute('/aguardando-aprovacao')({
  component: AguardandoAprovacaoPage,
  validateSearch: (search: Record<string, unknown>) => ({
    debug: typeof search.debug === 'string' ? search.debug : undefined,
  }),
})

function AguardandoAprovacaoPage() {
  const { debug } = useSearch({ from: '/aguardando-aprovacao' })

  return (
    <div style={{ maxWidth: 480, margin: '120px auto', padding: '0 24px', textAlign: 'center' }}>
      <ShieldCheck size={40} color="#6d28d9" style={{ margin: '0 auto 16px' }} />
      <h1 style={{ fontFamily: 'var(--serif)', color: 'var(--navy)' }}>Sua conta está em análise</h1>
      <p style={{ color: 'var(--muted)', lineHeight: 1.7 }}>
        Recebemos seu cadastro! Nossa equipe confirma cada matrícula manualmente antes de liberar o acesso à plataforma.
        Você vai receber um aviso assim que sua conta for aprovada.
      </p>
      {debug && (
        <pre style={{ textAlign: 'left', background: '#f4f2fb', border: '1px solid #e0dcf0', borderRadius: 8, padding: 12, marginTop: 24, fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {debug}
        </pre>
      )}
      <Link to="/" style={{ color: 'var(--purple)', fontWeight: 700, display: 'inline-block', marginTop: 24 }}>← Voltar para o início</Link>
    </div>
  )
}