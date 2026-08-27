import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { Bell, BookCheck, FileCheck2, PenLine, Zap } from 'lucide-react'
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
  { icon: BookCheck, label: 'Gabaritos dos Simulados', to: '/conteudo-admin/gabaritos', description: 'Envie os gabaritos em PDF dos simulados.' },
] as const

function ProfessorHubPage() {
  return (
    <main className="panel">
      <Link to="/dashboard" className="panel-back">← Voltar ao dashboard</Link>
      <h1>Painel do professor</h1>
      <p className="panel-subtitle">Correção de redações, lembretes para os alunos e dicas.</p>

      <div className="nav-grid">
        {links.map(({ icon: Icon, label, to, description }) => (
          <Link key={to} to={to} className="nav-card">
            <Icon size={20} />
            <b>{label}</b>
            <div className="nav-card-desc">{description}</div>
          </Link>
        ))}
      </div>
    </main>
  )
}
