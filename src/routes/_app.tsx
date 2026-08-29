import { Link, Outlet, createFileRoute, useRouterState } from '@tanstack/react-router'
import {
  BookCheck, BookMarked, CalendarDays, CircleHelp, CirclePlay, Files, Home, Library,
  LogOut, Menu, MessageSquareText, Pencil, Settings, Target, TrendingUp, User, Users, X, Zap,
  ChevronDown, FileCheck2,
} from 'lucide-react'
import { useState } from 'react'
import { useIdentity } from '@/lib/identity-context'
import { userHasRole } from '@/lib/roles'

export const Route = createFileRoute('/_app')({
  component: AppLayout,
})

// Agrupado por intenção (conteúdo / avaliar / acompanhar) em vez de uma lista única de
// 14 itens — mais rápido de escanear que um menu corrido. Cada grupo abre/fecha sozinho.
const sidebarGroups = [
  {
    title: null,
    items: [{ icon: Home, label: 'Dashboard', href: '/dashboard' }],
  },
  {
    title: 'Conteúdo',
    items: [
      { icon: CirclePlay, label: 'Aulas', href: '/aulas' },
      { icon: Library, label: 'Biblioteca', href: '/conteudo/biblioteca' },
      { icon: Files, label: 'Materiais', href: '/materiais' },
      { icon: CircleHelp, label: 'Questões', href: '/conteudo/questoes' },
      { icon: BookMarked, label: 'Repertórios', href: '/conteudo/repertorios' },
      { icon: Zap, label: 'Dicas', href: '/conteudo/dicas' },
    ],
  },
  {
    title: 'Avaliar',
    items: [
      { icon: Target, label: 'Simulados', href: '/simulados' },
      { icon: FileCheck2, label: 'Redações', href: '/redacoes' },
      { icon: BookCheck, label: 'Gabaritos dos Simulados', href: '/conteudo/gabaritos' },
    ],
  },
  {
    title: 'Acompanhar',
    items: [
      { icon: CalendarDays, label: 'Encontros Individuais', href: '/mentorias' },
      { icon: Users, label: 'Mentorias em grupo', href: '/mentorias-grupo' },
      { icon: TrendingUp, label: 'Meu progresso', href: '/progresso' },
      { icon: User, label: 'Perfil', href: '/perfil' },
    ],
  },
] as const

function AppLayout() {
  const { user, logout } = useIdentity()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set())
  const isAdmin = userHasRole(user, 'admin')
  const isProfessor = userHasRole(user, 'professor') && !isAdmin

  // Rota atual de verdade — o item ativo no menu reflete onde o aluno está, não um valor fixo.
  const pathname = useRouterState({ select: (state) => state.location.pathname })

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
        {/* Preenche o espaço roxo que sobra entre o menu e o rodapé da barra —
            era a maior área "vazia" da tela, mesmo com o menu recolhido. */}
        <div className="sidebar-watermark" aria-hidden="true">
          <Pencil />
          <span>Carla Patrícia</span>
        </div>
        <a href="mailto:contato@carlapatriciamedina.com.br" className="sidebar-help">
          <MessageSquareText size={16} />
          <span>Dúvida? Fale com a gente</span>
        </a>
        <button className="logout" onClick={() => void logout()}><LogOut /> Sair da conta</button>
      </aside>

      <section className="student-main">
        <button className="mobile-nav-toggle" onClick={() => setSidebarOpen(true)} aria-label="Abrir menu"><Menu /></button>
        <Outlet />
      </section>
    </main>
  )
}
