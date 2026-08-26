import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import {
  BookCheck, BookMarked, CalendarDays, CircleHelp, FileCheck2, Files, GraduationCap, Library, PencilLine, PenLine, Target, Users, Video, Zap,
} from 'lucide-react'
import { readLocalUser } from '@/lib/identity-context'
import { getServerUser } from '@/lib/auth'
import { userHasRole } from '@/lib/roles'

export const Route = createFileRoute('/admin')({
  beforeLoad: async () => {
    if (typeof window !== 'undefined') {
      const localUser = readLocalUser()
      if (localUser && userHasRole(localUser, 'admin')) return { user: localUser }
    }

    const user = await getServerUser()
    if (!user) throw redirect({ to: '/login' })
    if (!userHasRole(user, 'admin')) throw redirect({ to: '/dashboard' })
    return { user }
  },
  component: AdminHubPage,
})

const links = [
  { icon: Files, label: 'Materiais (Word/PDF)', to: '/materiais-admin', description: 'Arquivos exclusivos do dashboard.' },
  { icon: PencilLine, label: 'Aulas em vídeo', to: '/aulas-admin', description: 'Cadastre aulas com link de vídeo do YouTube.' },
  { icon: Video, label: 'Próxima aula ao vivo', to: '/aula-ao-vivo-admin', description: 'Configure data, horário e link do Zoom.' },
  { icon: FileCheck2, label: 'Correção de redações', to: '/redacoes-admin', description: 'Veja e corrija as redações enviadas pelos alunos.' },
  { icon: GraduationCap, label: 'Notas dos alunos', to: '/notas-admin', description: 'Todas as notas organizadas por aluno.' },
  { icon: PenLine, label: 'Temas de redação', to: '/temas-redacao-admin', description: 'Publique os temas e propostas que os alunos devem escrever.' },
  { icon: BookCheck, label: 'Gabaritos dos Simulados', to: '/conteudo-admin/gabaritos', description: 'Envie os gabaritos em PDF dos simulados.' },
  { icon: CalendarDays, label: 'Mentorias', to: '/mentorias-admin', description: 'Cadastre horários de mentoria individual.' },
  { icon: Users, label: 'Mentorias em grupo', to: '/mentorias-grupo-admin', description: 'Cadastre grupos com horário e número de vagas.' },
  { icon: Library, label: 'Biblioteca', to: '/conteudo-admin/biblioteca', description: 'PDFs da seção Biblioteca.' },
  { icon: CircleHelp, label: 'Questões', to: '/conteudo-admin/questoes', description: 'PDFs da seção Questões.' },
  { icon: Target, label: 'Simulados', to: '/simulados-admin', description: 'Cole questões e gabarito para o aluno fazer no site.' },
  { icon: BookMarked, label: 'Repertórios', to: '/conteudo-admin/repertorios', description: 'PDFs da seção Repertórios.' },
  { icon: Zap, label: 'Dicas', to: '/conteudo-admin/dicas', description: 'PDFs da seção Dicas.' },
] as const

function AdminHubPage() {
  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px', fontFamily: 'sans-serif' }}>
      <Link to="/dashboard" style={{ color: '#6d28d9', fontWeight: 700, textDecoration: 'none' }}>← Voltar ao dashboard</Link>
      <h1 style={{ fontFamily: 'var(--serif, serif)', color: '#0f2342', marginTop: 16 }}>Painel admin</h1>
      <p style={{ color: '#6b7280' }}>Gerencie todo o conteúdo da área do aluno a partir daqui.</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14, marginTop: 24 }}>
        {links.map(({ icon: Icon, label, to, description }) => (
          <Link
            key={to}
            to={to}
            style={{
              display: 'block', textDecoration: 'none', color: '#0f2342', background: '#fff',
              border: '1px solid #e0dcf0', borderRadius: 10, padding: 18,
            }}
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
