import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import {
  Bell, BookMarked, BookOpen, CalendarDays, ChevronRight, CircleHelp, CirclePlay,
  Clock3, Download, FileCheck2, Files, Home, Library, LogOut, Menu, MessageSquareText,
  MoreHorizontal, Search, ShieldCheck, Target, TrendingUp, Trophy, User, X, Zap,
} from 'lucide-react'
import { useState } from 'react'
import { readLocalUser, useIdentity } from '@/lib/identity-context'
import { getServerUser } from '@/lib/auth'

export const Route = createFileRoute('/dashboard')({
  beforeLoad: async () => {
    if (typeof window !== 'undefined') {
      const localUser = readLocalUser()
      if (localUser) return { user: localUser }
    }

    const user = await getServerUser()
    if (!user) throw redirect({ to: '/login', search: { debug: 'sem-usuario-no-servidor' } })
    if (!user.app_metadata?.roles?.includes('aprovado')) {
      throw redirect({
        to: '/aguardando-aprovacao',
        search: { debug: JSON.stringify(user, null, 2) },
      })
    }
    return { user }
  },
  component: DashboardPage,
})

const sidebarItems = [
  { icon: Home, label: 'Dashboard', href: '#top' },
  { icon: CirclePlay, label: 'Aulas', href: '/em-breve/aulas' },
  { icon: Library, label: 'Biblioteca', href: '/em-breve/biblioteca' },
  { icon: Files, label: 'Materiais', href: '#materiais' },
  { icon: CircleHelp, label: 'Questões', href: '/em-breve/questoes' },
  { icon: Target, label: 'Simulados', href: '/em-breve/simulados' },
  { icon: FileCheck2, label: 'Redações', href: '/em-breve/redacoes' },
  { icon: CalendarDays, label: 'Calendário', href: '/em-breve/calendario' },
  { icon: BookMarked, label: 'Repertórios', href: '/em-breve/repertorios' },
  { icon: Zap, label: 'Dicas', href: '/em-breve/dicas' },
  { icon: TrendingUp, label: 'Meu progresso', href: '/em-breve/progresso' },
  { icon: User, label: 'Perfil', href: '/em-breve/perfil' },
] as const
const materials = [
  { title: 'Mapa mental da redação', tag: 'Estratégia', accent: '#6d28d9', description: 'Estrutura completa para organizar tese, argumentos e conclusão com clareza.' },
  { title: 'Checklist de revisão', tag: 'Prático', accent: '#0f7890', description: 'Lista rápida para revisar coesão, concordância, pontuação e bordão de apresentação.' },
  { title: 'Guia de repertório', tag: 'Exclusivo', accent: '#c8a24d', description: 'Temas e ideias prontas para enriquecer seus textos com segurança e naturalidade.' },
] as const

function slugify(value: string) {
  return value.toLowerCase().normalize('NFD').replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-')
}

function downloadProtectedMaterial(materialTitle: string, studentName: string) {
  const canvas = document.createElement('canvas')
  canvas.width = 1200
  canvas.height = 1600
  const ctx = canvas.getContext('2d')

  if (!ctx) return

  const background = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
  background.addColorStop(0, '#f8f4ff')
  background.addColorStop(1, '#eef7ff')
  ctx.fillStyle = background
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  ctx.fillStyle = '#0f2342'
  ctx.font = '700 72px Arial'
  ctx.fillText('Material exclusivo', 100, 140)

  ctx.fillStyle = '#6d28d9'
  ctx.font = '700 92px Arial'
  ctx.fillText(materialTitle, 100, 260)

  ctx.strokeStyle = '#d9d7e7'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(100, 330)
  ctx.lineTo(1100, 330)
  ctx.stroke()

  ctx.fillStyle = '#3b4455'
  ctx.font = '500 38px Arial'
  ctx.fillText('Propriedade do aluno:', 100, 418)
  ctx.fillStyle = '#111827'
  ctx.font = '700 52px Arial'
  ctx.fillText(studentName, 100, 490)

  ctx.fillStyle = '#a1a9b7'
  ctx.font = '600 26px Arial'
  ctx.fillText('Download protegido · uso pessoal com marca d\'água', 100, 560)

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(100, 640, 1000, 720)

  ctx.strokeStyle = '#ece7f7'
  ctx.strokeRect(100, 640, 1000, 720)

  ctx.fillStyle = '#111827'
  ctx.font = '700 54px Arial'
  ctx.fillText('Conteúdo do material', 150, 730)

  ctx.fillStyle = '#4b5563'
  ctx.font = '500 34px Arial'
  const lines = [
    '• Estratégia clara e visual',
    '• Conteúdo pensado para o aluno',
    '• Uso exclusivo da plataforma',
    '• Proteção por marca d\'água com identidade',
  ]
  lines.forEach((line, index) => {
    ctx.fillText(line, 150, 805 + index * 58)
  })

  ctx.save()
  ctx.translate(canvas.width / 2, canvas.height / 2)
  ctx.rotate(-0.58)
  ctx.fillStyle = 'rgba(109, 40, 217, 0.09)'
  ctx.font = '700 112px Arial'
  ctx.fillText(studentName.toUpperCase(), -620, 0)
  ctx.restore()

  const link = document.createElement('a')
  const fileName = `${slugify(materialTitle)}-${slugify(studentName)}.png`
  link.download = fileName
  link.href = canvas.toDataURL('image/png')
  link.click()
}

function DashboardPage() {
  const { user, logout } = useIdentity()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const studentName = user?.name || ' '

  return (
    <main className="student-app">
      <aside className={sidebarOpen ? 'student-sidebar open' : 'student-sidebar'}>
        <div className="sidebar-head"><Link className="dashboard-brand" to="/"><span className="brand-mark"><img src="/logo-icone.png" alt="CPM" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></span><span><b>Carla Patrícia</b><small>Área do aluno</small></span></Link><button onClick={() => setSidebarOpen(false)}><X /></button></div>
        <nav>{sidebarItems.map(({ icon: Icon, label, href }, index) => <a className={index === 0 ? 'active' : ''} href={href} key={label}><Icon />{label}{label === 'Redações' && <i>2</i>}</a>)}</nav>
        <div className="sidebar-help"><MessageSquareText /><b>Precisa de ajuda?</b><p>Nossa equipe está por perto.</p><a href="mailto:contato@carlapatriciamedina.com.br">Falar com suporte</a></div>
        <button className="logout" onClick={() => void logout()}><LogOut /> Sair da conta</button>
      </aside>

      <section className="student-main" id="top">
        <header className="dashboard-topbar"><button className="dashboard-menu" onClick={() => setSidebarOpen(true)}><Menu /></button><div className="dashboard-search"><Search /><input placeholder="Buscar aulas, materiais, temas..." /></div><div className="topbar-actions"><button><Bell /><i /></button><div className="user-chip"><img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80" alt="Perfil" /><span><b>{studentName} </b><small>Aluna · Redação</small></span><ChevronRight /></div></div></header>

        <div className="dashboard-content">
          <div className="welcome-row"><div><span>{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }).toUpperCase()}</span><h1>Olá, {studentName}! <span>✦</span></h1><p>Você está construindo um excelente ritmo. Continue assim!</p></div><button className="outline-button"><CalendarDays /> Ver calendário</button></div>

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

            <section className="dashboard-card material-card" id="materiais">
              <div className="card-title">
                <div><span>Arquivos exclusivos</span><h3>Material protegido</h3></div>
                <ShieldCheck />
              </div>
              <p className="material-intro">Baixe os materiais do curso com uma marca d&apos;água personalizada com o nome do aluno para proteger cada arquivo.</p>
              <div className="material-list">
                {materials.map((material) => (
                  <div className="material-item" key={material.title}>
                    <div className="material-badge" style={{ background: `${material.accent}1a`, color: material.accent }}>{material.tag}</div>
                    <div>
                      <b>{material.title}</b>
                      <small>{material.description}</small>
                    </div>
                    <button onClick={() => downloadProtectedMaterial(material.title, studentName)}>
                      <Download /> Baixar
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <section className="dashboard-card correction-card"><div className="card-title"><div><span>Redação corrigida</span><h3>Inteligência artificial e sociedade</h3></div><span className="grade">920</span></div><p>Seu texto demonstrou excelente domínio da proposta. Há uma nova correção pronta para você.</p><div className="competencies">{[180,200,160,180,200].map((score, index) => <span key={index}><i style={{ height: `${score / 2.2}%` }} /><small>C{index + 1}</small><b>{score}</b></span>)}</div><button>Ver correção detalhada <ChevronRight /></button></section>
          </div>
        </div>
      </section>
    </main>
  )
}