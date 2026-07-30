import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import {
  Bell, BookMarked, BookOpen, CalendarDays, ChevronRight, CircleHelp, CirclePlay,
  Clock3, FileCheck2, Files, Home, Library, LogOut, Menu, MessageSquareText,
  MoreHorizontal, Search, Target, TrendingUp, Trophy, User, X, Zap,
} from 'lucide-react'
import { useState } from 'react'
import { useIdentity } from '@/lib/identity-context'
import { getServerUser } from '@/lib/auth'

export const Route = createFileRoute('/dashboard')({
  beforeLoad: async () => {
    const user = await getServerUser()
    if (!user) throw redirect({ to: '/login' })
    return { user }
  },
  component: DashboardPage,
})

const sidebarItems = [
  [Home, 'Dashboard'], [CirclePlay, 'Aulas'], [Library, 'Biblioteca'], [Files, 'Materiais'],
  [CircleHelp, 'Questões'], [Target, 'Simulados'], [FileCheck2, 'Redações'], [CalendarDays, 'Calendário'],
  [BookMarked, 'Repertórios'], [Zap, 'Dicas'], [TrendingUp, 'Meu progresso'], [User, 'Perfil'],
] as const

function DashboardPage() {
  const { user, logout } = useIdentity()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const studentName = user?.name?.split(' ')[0] || 'Marina'

  return (
    <main className="student-app">
      <aside className={sidebarOpen ? 'student-sidebar open' : 'student-sidebar'}>
        <div className="sidebar-head"><Link className="dashboard-brand" to="/"><span className="brand-mark">CP</span><span><b>Carla Patrícia</b><small>Área do aluno</small></span></Link><button onClick={() => setSidebarOpen(false)}><X /></button></div>
        <nav>{sidebarItems.map(([Icon, label], index) => <a className={index === 0 ? 'active' : ''} href={index === 0 ? '#top' : '#em-breve'} key={label}><Icon />{label}{index === 6 && <i>2</i>}</a>)}</nav>
        <div className="sidebar-help"><MessageSquareText /><b>Precisa de ajuda?</b><p>Nossa equipe está por perto.</p><a href="mailto:contato@carlapatriciamedina.com.br">Falar com suporte</a></div>
        <button className="logout" onClick={() => void logout()}><LogOut /> Sair da conta</button>
      </aside>

      <section className="student-main" id="top">
        <header className="dashboard-topbar"><button className="dashboard-menu" onClick={() => setSidebarOpen(true)}><Menu /></button><div className="dashboard-search"><Search /><input placeholder="Buscar aulas, materiais, temas..." /></div><div className="topbar-actions"><button><Bell /><i /></button><div className="user-chip"><img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80" alt="Perfil" /><span><b>{studentName} Azevedo</b><small>Aluna · Redação</small></span><ChevronRight /></div></div></header>

        <div className="dashboard-content">
          <div className="welcome-row"><div><span>TERÇA-FEIRA, 28 DE JULHO</span><h1>Olá, {studentName}! <span>✦</span></h1><p>Você está construindo um excelente ritmo. Continue assim!</p></div><button className="outline-button"><CalendarDays /> Ver calendário</button></div>

          <section className="dashboard-hero-card"><div><span className="pill"><Zap /> Sua jornada</span><h2>Faltam <em>103 dias</em> para o ENEM.</h2><p>Cada aula concluída hoje deixa você mais perto da aprovação.</p><button>Continuar estudando <CirclePlay /></button></div><div className="hero-ring"><div><b>76%</b><span>progresso geral</span></div></div><div className="dashboard-decoration">A+</div></section>

          <div className="dashboard-grid">
            <section className="dashboard-card progress-card"><div className="card-title"><div><span>Meu progresso</span><h3>Visão geral</h3></div><button><MoreHorizontal /></button></div><div className="progress-list">
              {[['Redação', '18 de 24 aulas', 75, '#6d28d9'], ['Gramática', '14 de 20 aulas', 70, '#0f7890'], ['Repertório', '8 de 16 aulas', 50, '#c8a24d']].map(([title, detail, value, color]) => <div key={title as string}><span><b>{title}</b><small>{detail}</small></span><div><i style={{ width: `${value}%`, background: color }} /></div><strong>{value}%</strong></div>)}
            </div><a href="#progresso">Ver relatório completo <ChevronRight /></a></section>

            <section className="dashboard-card next-class"><div className="card-title"><div><span>Próxima aula</span><h3>Hoje, às 19h</h3></div><span className="live-dot">Ao vivo</span></div><div className="class-thumb"><img src="https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=900&q=85" alt="Caderno de estudos" /><span><CirclePlay /></span></div><small>MÓDULO 04 · REDAÇÃO</small><h4>Projeto de texto: da tese à conclusão</h4><p><Clock3 /> 1h30 de duração · Prof.ª Carla</p><button>Entrar na aula <ChevronRight /></button></section>

            <section className="dashboard-card weekly-goal"><div className="card-title"><div><span>Meta semanal</span><h3>4 de 5 atividades</h3></div><Trophy /></div><div className="week-days">{['S','T','Q','Q','S','S','D'].map((day, index) => <span className={index < 4 ? 'done' : index === 4 ? 'today' : ''} key={`${day}${index}`}><i>{index < 4 ? '✓' : index + 28}</i><small>{day}</small></span>)}</div><p>Você está a uma atividade de completar sua meta!</p></section>

            <section className="dashboard-card recent-content"><div className="card-title"><div><span>Continue de onde parou</span><h3>Últimas aulas</h3></div><a href="#aulas">Ver todas</a></div>{[
              ['Competência 3: argumentação', 'Redação · 72%', '32 min'], ['Concordância verbal', 'Gramática · 45%', '28 min'], ['Repertório sociocultural', 'Repertório · 20%', '41 min'],
            ].map(([title, info, time], index) => <div className="recent-item" key={title}><span className={`recent-icon icon-${index}`}><BookOpen /></span><div><b>{title}</b><small>{info}</small></div><span><Clock3 />{time}</span><button><CirclePlay /></button></div>)}</section>

            <section className="dashboard-card correction-card"><div className="card-title"><div><span>Redação corrigida</span><h3>Inteligência artificial e sociedade</h3></div><span className="grade">920</span></div><p>Seu texto demonstrou excelente domínio da proposta. Há uma nova correção pronta para você.</p><div className="competencies">{[180,200,160,180,200].map((score, index) => <span key={index}><i style={{ height: `${score / 2.2}%` }} /><small>C{index + 1}</small><b>{score}</b></span>)}</div><button>Ver correção detalhada <ChevronRight /></button></section>
          </div>
        </div>
      </section>
    </main>
  )
}
