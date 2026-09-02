import { createFileRoute, Link } from '@tanstack/react-router'
import { noindexHead } from '@/lib/seo'

const titulos: Record<string, string> = {
  aulas: 'Aulas',
  biblioteca: 'Biblioteca',
  questoes: 'Questões',
  simulados: 'Simulados',
  redacoes: 'Redações',
  calendario: 'Calendário',
  repertorios: 'Repertórios',
  dicas: 'Dicas',
  progresso: 'Meu progresso',
  perfil: 'Perfil',
}

export const Route = createFileRoute('/em-breve/$secao')({
  head: noindexHead,
  component: EmBrevePage,
})

function EmBrevePage() {
  const { secao } = Route.useParams()
  const titulo = titulos[secao] || 'Esta seção'

  return (
    <div style={{ maxWidth: 560, margin: '120px auto', padding: '0 24px', textAlign: 'center' }}>
      <h1 style={{ fontFamily: 'var(--serif)', color: 'var(--navy)' }}>{titulo} está a caminho</h1>
      <p style={{ color: 'var(--muted)', lineHeight: 1.7 }}>
        Estamos preparando esse conteúdo com carinho. Em breve você vai poder acessá-lo por aqui.
      </p>
      <Link to="/dashboard" style={{ color: 'var(--purple)', fontWeight: 700, display: 'inline-block', marginTop: 24 }}>← Voltar para o painel</Link>
    </div>
  )
}