import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import {
  BookCheck, BookMarked, CalendarClock, CalendarDays, CircleHelp, FileCheck2, Files, GraduationCap, Images, Library, MessageCircleHeart, Monitor, PencilLine, PenLine, ScrollText, Target, TrendingUp, Users, Video, Zap,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { readLocalUser } from '@/lib/identity-context'
import { getServerUser } from '@/lib/auth'
import { userHasRole } from '@/lib/roles'
import { getAdminNotificationCounts, type AdminNotificationCounts } from '@/lib/admin-notifications'

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
  { icon: Files, label: 'Materiais (Word/PDF)', to: '/materiais-admin', description: 'Arquivos exclusivos do dashboard.', badgeKey: undefined },
  { icon: PencilLine, label: 'Aulas em vídeo', to: '/aulas-admin', description: 'Cadastre aulas com link de vídeo do YouTube.', badgeKey: undefined },
  { icon: Video, label: 'Próxima aula ao vivo', to: '/aula-ao-vivo-admin', description: 'Configure data, horário e link do Zoom.', badgeKey: undefined },
  { icon: FileCheck2, label: 'Correção de redações', to: '/redacoes-admin', description: 'Veja e corrija as redações enviadas pelos alunos.', badgeKey: 'redacoesPendentes' as const },
  { icon: GraduationCap, label: 'Notas dos alunos', to: '/notas-admin', description: 'Todas as notas organizadas por aluno.', badgeKey: undefined },
  { icon: TrendingUp, label: 'Evolução dos alunos', to: '/evolucao-admin', description: 'Como cada aluno está indo em redação, materiais e progresso.', badgeKey: undefined },
  { icon: Images, label: 'Galeria dos Aprovados', to: '/aprovados-admin', description: 'Cadastre os alunos aprovados na faculdade, com foto.', badgeKey: undefined },
  { icon: Monitor, label: 'Aparelhos conectados', to: '/sessoes-admin', description: 'Histórico de logins de cada aluno, um aparelho por vez.', badgeKey: undefined },
  { icon: MessageCircleHeart, label: 'Recados dos alunos', to: '/recados-admin', description: 'Mensagens que os alunos mandaram pelo perfil deles.', badgeKey: 'recadosNaoLidos' as const },
  { icon: PenLine, label: 'Temas de redação', to: '/temas-redacao-admin', description: 'Publique os temas e propostas que os alunos devem escrever.', badgeKey: undefined },
  { icon: BookCheck, label: 'Gabaritos dos Simulados', to: '/conteudo-admin/gabaritos', description: 'Envie os gabaritos em PDF dos simulados.', badgeKey: undefined },
  { icon: CalendarClock, label: 'Calendário do curso', to: '/calendario-admin', description: 'Aulas ao vivo, aulas liberadas, simulados e simuladões na agenda do aluno.', badgeKey: undefined },
  { icon: CalendarDays, label: 'Mentoria individual', to: '/mentorias-admin', description: 'Cadastre horários de mentoria individual.', badgeKey: undefined },
  { icon: Users, label: 'Mentorias em grupo', to: '/mentorias-grupo-admin', description: 'Cadastre grupos com horário e número de vagas.', badgeKey: undefined },
  { icon: Library, label: 'Biblioteca', to: '/conteudo-admin/biblioteca', description: 'PDFs da seção Biblioteca.', badgeKey: undefined },
  { icon: CircleHelp, label: 'Questões (PDF)', to: '/conteudo-admin/questoes', description: 'Listas de exercício em PDF.', badgeKey: undefined },
  { icon: Target, label: 'Questões para treino', to: '/simulados-admin', description: 'Cole questões objetivas e o gabarito — o aluno responde no site, com nota na hora.', badgeKey: undefined },
  { icon: BookMarked, label: 'Repertórios', to: '/conteudo-admin/repertorios', description: 'PDFs da seção Repertórios.', badgeKey: undefined },
  { icon: Zap, label: 'Dicas', to: '/conteudo-admin/dicas', description: 'PDFs da seção Dicas.', badgeKey: undefined },
  { icon: ScrollText, label: 'Edital da prova', to: '/conteudo-admin/edital', description: 'PDFs do edital oficial da prova.', badgeKey: undefined },
] as const

function AdminHubPage() {
  const [counts, setCounts] = useState<AdminNotificationCounts | null>(null)

  useEffect(() => {
    getAdminNotificationCounts().then(setCounts).catch((error) => console.error('Não foi possível carregar as notificações do painel:', error))
  }, [])

  return (
    <main className="panel panel-wide">
      <Link to="/dashboard" className="panel-back">← Voltar ao dashboard</Link>
      <h1>Painel admin</h1>
      <p className="panel-subtitle">Gerencie todo o conteúdo da área do aluno a partir daqui.</p>

      <div className="nav-grid">
        {links.map(({ icon: Icon, label, to, description, badgeKey }) => {
          const count = badgeKey && counts ? counts[badgeKey] : 0
          return (
            <Link key={to} to={to} className="nav-card">
              {count > 0 && <span className="nav-card-badge">{count}</span>}
              <Icon size={20} />
              <b>{label}</b>
              <div className="nav-card-desc">{description}</div>
            </Link>
          )
        })}
      </div>
    </main>
  )
}
