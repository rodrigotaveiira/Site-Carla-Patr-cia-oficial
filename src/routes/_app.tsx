import { Link, Outlet, createFileRoute, useRouterState } from '@tanstack/react-router'
import {
  BookMarked, CalendarClock, CalendarDays, CircleHelp, CirclePlay, Files, Home, Library,
  LogOut, Menu, MessageCircleHeart, MessageSquareText, Settings, Target, TrendingUp, User, Users, X, Zap,
  ChevronDown, FileCheck2,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useIdentity } from '@/lib/identity-context'
import { userHasRole } from '@/lib/roles'
import { AcademicBackground } from '@/components/AcademicBackground'

export const Route = createFileRoute('/_app')({
  component: AppLayout,
})

// Agrupado por intenção (conteúdo / praticar / acompanhamento) em vez de uma lista única
// de itens — mais rápido de escanear que um menu corrido. Cada grupo abre/fecha sozinho.
// Gabaritos não tem item próprio: a correção comentada aparece dentro do fluxo de
// Simulados (tela de resultado), não como destino separado no menu.
const sidebarGroups = [
  {
    title: null,
    items: [{ icon: Home, label: 'Dashboard', href: '/dashboard' }],
  },
  {
    title: 'Conteúdo',
    items: [
      { icon: CirclePlay, label: 'Aulas', href: '/aulas' },
      { icon: Files, label: 'Materiais', href: '/materiais' },
      { icon: Library, label: 'Biblioteca', href: '/conteudo/biblioteca' },
      { icon: BookMarked, label: 'Repertórios', href: '/conteudo/repertorios' },
      { icon: Zap, label: 'Dicas', href: '/conteudo/dicas' },
    ],
  },
  {
    title: 'Praticar',
    items: [
      { icon: CircleHelp, label: 'Questões', href: '/conteudo/questoes' },
      { icon: Target, label: 'Simulados', href: '/simulados' },
      { icon: FileCheck2, label: 'Redações', href: '/redacoes' },
    ],
  },
  {
    title: 'Acompanhamento',
    items: [
      { icon: CalendarClock, label: 'Calendário', href: '/calendario' },
      { icon: TrendingUp, label: 'Meu progresso', href: '/progresso' },
      { icon: CalendarDays, label: 'Mentoria individual', href: '/mentorias' },
      { icon: Users, label: 'Mentorias em grupo', href: '/mentorias-grupo' },
      { icon: MessageCircleHeart, label: 'Fale com a Carlinha', href: '/perfil' },
    ],
  },
] as const

function initialsFrom(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0] + parts[parts.length - 1]![0]).toUpperCase()
}

function AppLayout() {
  const { user, logout } = useIdentity()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set())
  const [accountOpen, setAccountOpen] = useState(false)
  const accountRef = useRef<HTMLDivElement>(null)
  const isAdmin = userHasRole(user, 'admin')
  const isProfessor = userHasRole(user, 'professor') && !isAdmin

  // Rota atual de verdade — o item ativo no menu reflete onde o aluno está, não um valor fixo.
  const pathname = useRouterState({ select: (state) => state.location.pathname })

  const displayName = user?.user_metadata?.full_name?.trim() || user?.email || 'Minha conta'

  // Clique fora ou Esc fecha o menu da conta — comportamento padrão de dropdown.
  useEffect(() => {
    if (!accountOpen) return
    function handlePointerDown(event: MouseEvent) {
      if (accountRef.current && !accountRef.current.contains(event.target as Node)) setAccountOpen(false)
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setAccountOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [accountOpen])

  function toggleGroup(title: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev)
      if (next.has(title)) next.delete(title)
      else next.add(title)
      return next
    })
  }

  return (
    <main className="student-app">
      <aside className={sidebarOpen ? 'student-sidebar open' : 'student-sidebar'}>
        <div className="sidebar-head">
          <Link className="dashboard-brand" to="/">
            <span className="brand-mark"><img src="/logo-icone.png" alt="CPM" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></span>
            <span><b>Carla Patrícia</b><small>Área do aluno</small></span>
          </Link>
          <button onClick={() => setSidebarOpen(false)}><X /></button>
        </div>
        <nav>
          {sidebarGroups.map((group) => (
            <div className="sidebar-group" key={group.title ?? 'inicio'}>
              {group.title && (
                <button type="button" className="sidebar-group-title" onClick={() => toggleGroup(group.title)}>
                  {group.title}
                  <ChevronDown size={13} className={openGroups.has(group.title) ? 'open' : ''} />
                </button>
              )}
              {(!group.title || openGroups.has(group.title)) && group.items.map(({ icon: Icon, label, href }) => (
                // `href` mistura rotas fixas ("/aulas") com rotas de conteúdo por seção
                // ("/conteudo/biblioteca", que na verdade é a rota dinâmica /conteudo/$secao) —
                // o `as any` é só pra essa lista genérica aceitar as duas formas.
                <Link className={pathname === href ? 'active' : ''} to={href as any} key={label} onClick={() => setSidebarOpen(false)}>
                  <Icon />{label}
                </Link>
              ))}
            </div>
          ))}
          {(isAdmin || isProfessor) && (
            <div className="sidebar-group">
              <button type="button" className="sidebar-group-title" onClick={() => toggleGroup('Administração')}>
                Administração
                <ChevronDown size={13} className={openGroups.has('Administração') ? 'open' : ''} />
              </button>
              {openGroups.has('Administração') && (
                <>
                  {isAdmin && <Link to="/admin" onClick={() => setSidebarOpen(false)}><Settings />Painel admin</Link>}
                  {isProfessor && <Link to="/professor" onClick={() => setSidebarOpen(false)}><Settings />Painel do professor</Link>}
                </>
              )}
            </div>
          )}
        </nav>
        <div className="sidebar-foot">
          <div className="account-menu" ref={accountRef}>
            <button
              type="button"
              className="account-trigger"
              onClick={() => setAccountOpen((prev) => !prev)}
              aria-haspopup="menu"
              aria-expanded={accountOpen}
            >
              <span className="account-avatar">{initialsFrom(displayName)}</span>
              <span className="account-name">{displayName}</span>
              <ChevronDown size={14} className={accountOpen ? 'open' : ''} />
            </button>
            {accountOpen && (
              <div className="account-panel" role="menu">
                <Link to="/perfil" role="menuitem" onClick={() => { setAccountOpen(false); setSidebarOpen(false) }}>
                  <User size={15} /> Perfil
                </Link>
                <button type="button" role="menuitem" onClick={() => void logout()}>
                  <LogOut size={15} /> Sair da conta
                </button>
              </div>
            )}
          </div>
          <a href="mailto:contato@carlapatriciamedina.com.br" className="sidebar-help">
            <MessageSquareText size={16} />
            <span>Dúvida? Fale com a gente</span>
          </a>
        </div>
      </aside>

      <section className="student-main">
        <AcademicBackground />
        <button className="mobile-nav-toggle" onClick={() => setSidebarOpen(true)} aria-label="Abrir menu"><Menu /></button>
        <Outlet />
      </section>
    </main>
  )
}
