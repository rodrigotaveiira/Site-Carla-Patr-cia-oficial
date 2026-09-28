import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import {
  Bell, BellOff, BookCheck, BookMarked, CalendarClock, CalendarDays, CircleHelp, FileCheck2, Files, GraduationCap, Images, Library, MessageCircleHeart, MessageSquareText, Monitor, PencilLine, PenLine, ScrollText, Send, Target, TrendingUp, Users, Video, Zap,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { readLocalUser } from '@/lib/identity-context'
import { getServerUser } from '@/lib/auth'
import { userHasRole } from '@/lib/roles'
import { getAdminNotificationCounts, type AdminNotificationCounts } from '@/lib/admin-notifications'
import { getAvisosDeNovidade, setAvisosDeNovidade } from '@/lib/notification-settings'
import { useToast } from '@/lib/toast'
import { VoltarAoPainel } from '@/components/VoltarAoPainel'

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
  { icon: GraduationCap, label: 'Notas dos alunos', to: '/notas-admin', description: 'Notas de redação e das questões para treino, organizadas por aluno.', badgeKey: undefined },
  { icon: TrendingUp, label: 'Evolução dos alunos', to: '/evolucao-admin', description: 'Como cada aluno está indo em redação, materiais e progresso.', badgeKey: undefined },
  { icon: Images, label: 'Galeria dos Aprovados', to: '/aprovados-admin', description: 'Cadastre os alunos aprovados na faculdade, com foto.', badgeKey: undefined },
  { icon: Monitor, label: 'Aparelhos conectados', to: '/sessoes-admin', description: 'Histórico de logins de cada aluno, um aparelho por vez.', badgeKey: undefined },
  { icon: MessageCircleHeart, label: 'Recados dos alunos', to: '/recados-admin', description: 'Mensagens que os alunos mandaram pelo perfil deles.', badgeKey: 'recadosNaoLidos' as const },
  { icon: PenLine, label: 'Temas de redação', to: '/temas-redacao-admin', description: 'Publique os temas e propostas que os alunos devem escrever.', badgeKey: undefined },
  { icon: BookCheck, label: 'Gabaritos dos Simulados', to: '/conteudo-admin/gabaritos', description: 'Envie os gabaritos em PDF dos simulados.', badgeKey: undefined },
  { icon: CalendarClock, label: 'Calendário do curso', to: '/calendario-admin', description: 'Aulas ao vivo, aulas liberadas, simulados e simuladões na agenda do aluno.', badgeKey: undefined },
  { icon: CalendarDays, label: 'Mentoria individual', to: '/mentorias-admin', description: 'Cadastre horários de mentoria individual.', badgeKey: undefined },
  { icon: Users, label: 'Mentorias em grupo', to: '/mentorias-grupo-admin', description: 'Cadastre grupos com horário e número de vagas.', badgeKey: undefined },
  { icon: Send, label: 'Convite para as mentorias', to: '/convite-mentorias-admin', description: 'Lembre os alunos de reservar vaga nos grupos que ainda têm lugar.', badgeKey: undefined },
  { icon: MessageSquareText, label: 'Mensagem para os alunos', to: '/mensagem-alunos-admin', description: 'Mande um recado por e-mail pra turma toda — como lembrar da importância dos exercícios e das redações.', badgeKey: undefined },
  { icon: Library, label: 'Biblioteca', to: '/conteudo-admin/biblioteca', description: 'PDFs da seção Biblioteca.', badgeKey: undefined },
  { icon: CircleHelp, label: 'Questões (PDF)', to: '/conteudo-admin/questoes', description: 'Listas de exercício em PDF.', badgeKey: undefined },
  { icon: Target, label: 'Questões para treino', to: '/simulados-admin', description: 'Cole questões objetivas e o gabarito — o aluno responde no site, com nota na hora.', badgeKey: undefined },
  { icon: BookMarked, label: 'Repertórios', to: '/conteudo-admin/repertorios', description: 'PDFs da seção Repertórios.', badgeKey: undefined },
  { icon: Zap, label: 'Dicas', to: '/conteudo-admin/dicas', description: 'PDFs da seção Dicas.', badgeKey: undefined },
  { icon: ScrollText, label: 'Edital da prova', to: '/conteudo-admin/edital', description: 'PDFs do edital oficial da prova.', badgeKey: undefined },
] as const

function AvisosDeNovidadeToggle() {
  const showToast = useToast()
  const [ativo, setAtivo] = useState<boolean | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getAvisosDeNovidade()
      .then((r) => setAtivo(r.ativo))
      .catch((error) => console.error('Não foi possível carregar a configuração de avisos:', error))
  }, [])

  async function handleToggle() {
    if (ativo === null) return
    setSaving(true)
    try {
      const resultado = await setAvisosDeNovidade({ data: { ativo: !ativo } })
      setAtivo(resultado.ativo)
      showToast(resultado.ativo ? 'Avisos automáticos reativados.' : 'Avisos automáticos pausados até você reativar.')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Não foi possível salvar.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const pausado = ativo === false

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
        marginTop: 18, padding: '14px 18px', borderRadius: 10,
        background: pausado ? '#fef2f2' : 'var(--lilac-tint)',
        border: pausado ? '1px solid #fecaca' : 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        {pausado ? <BellOff size={18} color="#dc2626" style={{ flexShrink: 0 }} /> : <Bell size={18} color="var(--purple)" style={{ flexShrink: 0 }} />}
        <div style={{ minWidth: 0 }}>
          <b style={{ color: 'var(--navy)', fontSize: 13.5 }}>
            Avisos automáticos de conteúdo novo {pausado ? 'pausados' : 'ativos'}
          </b>
          <div className="list-meta" style={{ marginTop: 2 }}>
            E-mail pra turma de material, mentoria e conteúdo novo. Pause antes de inserir vários itens em sequência, pra não gastar a cota diária.
          </div>
        </div>
      </div>
      <button
        onClick={handleToggle}
        disabled={ativo === null || saving}
        className={pausado ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
        style={{ flexShrink: 0 }}
      >
        {saving ? 'Salvando...' : pausado ? 'Reativar avisos' : 'Pausar avisos'}
      </button>
    </div>
  )
}

function AdminHubPage() {
  const [counts, setCounts] = useState<AdminNotificationCounts | null>(null)

  useEffect(() => {
    getAdminNotificationCounts().then(setCounts).catch((error) => console.error('Não foi possível carregar as notificações do painel:', error))
  }, [])

  return (
    <main className="panel panel-wide">
      <VoltarAoPainel />
      <h1>Painel admin</h1>
      <p className="panel-subtitle">Gerencie todo o conteúdo da área do aluno a partir daqui.</p>

      <AvisosDeNovidadeToggle />

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
