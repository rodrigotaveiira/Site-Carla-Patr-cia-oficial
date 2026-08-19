import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { Bell, FileCheck2, PenLine, Zap } from 'lucide-react'
import { readLocalUser } from '@/lib/identity-context'
import { getServerUser } from '@/lib/auth'
import { isStaff } from '@/lib/roles'

export const Route = createFileRoute('/professor')({
  beforeLoad: async () => {
    if (typeof window !== 'undefined') {
      const localUser = readLocalUser()
      if (localUser && isStaff(localUser)) return { user: localUser }
    }

    const user = await getServerUser()
    if (!user) throw redirect({ to: '/login' })
    if (!isStaff(user)) throw redirect({ to: '/dashboard' })
    return { user }
  },
  component: ProfessorHubPage,
})

const links = [
  { icon: FileCheck2, label: 'Correção de redações', to: '/redacoes-admin', description: 'Veja e corrija as redações enviadas pelos alunos.' },
  { icon: PenLine, label: 'Temas de redação', to: '/temas-redacao-admin', description: 'Publique os temas e propostas que os alunos devem escrever.' },
  { icon: Bell, label: 'Lembretes', to: '/lembretes-admin', description: 'Envie avisos para todos os alunos.' },
  { icon: Zap, label: 'Dicas', to: '/conteudo-admin/dicas', description: 'Envie PDFs para a seção Dicas.' },
] as const

function ProfessorHubPage() {
  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: '48px 24px', fontFamily: 'sans-serif' }}>
      <Link to="/dashboard" style={{ color: '#6d28d9', fontWeight: 700, textDecoration: 'none' }}>← Voltar ao dashboard</Link>
      <h1 style={{ fontFamily: 'var(--serif, serif)', color: '#0f2342', marginTop: 16 }}>Painel do professor</h1>
      <p style={{ color: '#6b7280' }}>Correção de redações, lembretes para os alunos e dicas.</p>

      <div style={{ display: 'grid', gap: 14, marginTop: 24 }}>
        {links.map(({ icon: Icon, label, to, description }) => (
          <Link
            key={to}
            to={to}
            style={{ display: 'block', textDecoration: 'none', color: '#0f2342', background: '#fff', border: '1px solid #e0dcf0', borderRadius: 10, padding: 18 }}
          >
            <Icon color="#6d28d9" />
            <div style={{ fontWeight: 700, marginTop: 10 }}>{label}</div>
            <div style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>{description}</div>
          </Link>
        ))}
      </div>
    </main>
  )
}
