import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import {
  Bell, BookMarked, BookOpen, CalendarDays, ChevronRight, CircleHelp, CirclePlay,
  Clock3, Download, FileCheck2, Files, Home, Library, LogOut, Menu, MessageSquareText,
  MoreHorizontal, Search, Settings, ShieldCheck, Target, TrendingUp, Trophy, User, X, Zap,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { readLocalUser, useIdentity } from '@/lib/identity-context'
import { getServerUser } from '@/lib/auth'
import { userHasRole } from '@/lib/roles'
import { getMyProfilePhoto, saveMyProfilePhoto } from '@/lib/profile-photo'
import { getWeeklyGoal, registerAccessAndGetWeeklyGoal, type WeeklyGoal } from '@/lib/weekly-activity'
import { getMaterialFile, listMaterials, type Material } from '@/lib/materials'
import { getContentCounts, type ContentCounts } from '@/lib/progress'

const WHATSAPP_LINK = 'https://wa.me/5522999325306'

type MaterialMeta = Omit<Material, 'fileDataUrl'>

// Tempo mínimo que o aluno precisa ficar na plataforma para o dia contar na meta semanal.
const MINUTES_TO_COUNT_ACCESS = 10

// Tempo de inatividade (sem tocar na tela/teclado/mouse) até deslogar o aluno automaticamente.
const INACTIVITY_LIMIT_MINUTES = 15

export const Route = createFileRoute('/dashboard')({
  beforeLoad: async () => {
    if (typeof window !== 'undefined') {
      const localUser = readLocalUser()
      if (localUser) return { user: localUser }
    }

    const user = await getServerUser()
    if (!user) throw redirect({ to: '/login', search: { debug: 'sem-usuario-no-servidor' } })
    if (!userHasRole(user, 'aprovado') && !userHasRole(user, 'admin')) {
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
  { icon: CirclePlay, label: 'Aulas', href: '/aulas' },
  { icon: Library, label: 'Biblioteca', href: '/conteudo/biblioteca' },
  { icon: Files, label: 'Materiais', href: '#materiais' },
  { icon: CircleHelp, label: 'Questões', href: '/conteudo/questoes' },
  { icon: Target, label: 'Simulados', href: '/conteudo/simulados' },
  { icon: FileCheck2, label: 'Redações', href: '/redacoes' },
  { icon: CalendarDays, label: 'Mentorias', href: '/mentorias' },
  { icon: BookMarked, label: 'Repertórios', href: '/conteudo/repertorios' },
  { icon: Zap, label: 'Dicas', href: '/conteudo/dicas' },
  { icon: TrendingUp, label: 'Meu progresso', href: '/progresso' },
  { icon: User, label: 'Perfil', href: '/em-breve/perfil' },
] as const
async function downloadMaterial(id: string) {
  const { fileName, fileDataUrl } = await getMaterialFile({ data: { id } })
  const link = document.createElement('a')
  link.download = fileName
  link.href = fileDataUrl
  link.click()
}

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80'

const ENEM_DATE = new Date('2026-11-22T00:00:00')
const WEEKDAY_LETTERS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'] // segunda a domingo

function diasParaEnem() {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const diffMs = ENEM_DATE.getTime() - hoje.getTime()
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
}

function DashboardPage() {
  const { user, logout } = useIdentity()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const studentName = user?.name || ' '
  const isAdmin = userHasRole(user, 'admin')

  const [materials, setMaterials] = useState<MaterialMeta[]>([])
  const [materialsError, setMaterialsError] = useState('')
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  useEffect(() => {
    listMaterials()
      .then((data) => setMaterials(data as MaterialMeta[]))
      .catch(() => setMaterialsError('Não foi possível carregar os materiais agora.'))
  }, [])

  async function handleDownload(id: string) {
    setDownloadingId(id)
    setMaterialsError('')
    try {
      await downloadMaterial(id)
    } catch (err) {
      setMaterialsError(err instanceof Error ? err.message : 'Não foi possível baixar o material.')
    } finally {
      setDownloadingId(null)
    }
  }

  const recentContent = [
    ['Competência 3: argumentação', 'Redação · 72%', '32 min'],
    ['Concordância verbal', 'Gramática · 45%', '28 min'],
    ['Repertório sociocultural', 'Repertório · 20%', '41 min'],
  ] as const

  const [contentCounts, setContentCounts] = useState<ContentCounts | null>(null)
  useEffect(() => {
    getContentCounts().then(setContentCounts).catch(() => { /* mantém null, card mostra "Carregando..." */ })
  }, [])

  const [searchQuery, setSearchQuery] = useState('')
  const query = searchQuery.trim().toLowerCase()
  const filteredMaterials = useMemo(
    () => (query ? materials.filter((m) => `${m.title} ${m.tag}`.toLowerCase().includes(query)) : materials),
    [materials, query],
  )
  const filteredRecent = useMemo(
    () => (query ? recentContent.filter(([title, info]) => `${title} ${info}`.toLowerCase().includes(query)) : recentContent),
    [query],
  )

  const [notificationsOpen, setNotificationsOpen] = useState(false)

  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const photoInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getMyProfilePhoto()
      .then((saved) => { if (saved) setPhotoUrl(saved) })
      .catch(() => { /* aluno ainda não tem foto salva, sem problema */ })
  }, [])

  // Desloga automaticamente o aluno depois de INACTIVITY_LIMIT_MINUTES minutos sem uso
  // (sem tocar na tela, sem digitar, sem rolar — inclusive com o celular apagado).
  useEffect(() => {
    const LAST_ACTIVITY_KEY = 'cpm:last-activity-at'
    const markActivity = () => { localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now())) }
    markActivity()

    const checkInactivity = () => {
      const last = Number(localStorage.getItem(LAST_ACTIVITY_KEY) || Date.now())
      const minutesIdle = (Date.now() - last) / (60 * 1000)
      if (minutesIdle >= INACTIVITY_LIMIT_MINUTES) {
        void logout()
      }
    }

    const activityEvents = ['mousemove', 'keydown', 'touchstart', 'scroll', 'click']
    activityEvents.forEach((eventName) => window.addEventListener(eventName, markActivity))

    // Se o celular apaga e volta a tela (ou o app volta pro primeiro plano), confere na hora.
    const handleVisibility = () => { if (document.visibilityState === 'visible') checkInactivity() }
    document.addEventListener('visibilitychange', handleVisibility)

    const interval = setInterval(checkInactivity, 30 * 1000)

    return () => {
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, markActivity))
      document.removeEventListener('visibilitychange', handleVisibility)
      clearInterval(interval)
    }
  }, [logout])

  const [weeklyGoal, setWeeklyGoal] = useState<WeeklyGoal | null>(null)

  // Ao abrir o dashboard, só exibe a meta semanal já salva — ainda não marca o dia de hoje.
  useEffect(() => {
    getWeeklyGoal()
      .then((result) => { if (result) setWeeklyGoal(result) })
      .catch(() => { /* sem conexão com o servidor, o card usa o estado padrão */ })
  }, [])

  // Só depois que o aluno fica MINUTES_TO_COUNT_ACCESS minutos com a aba aberta,
  // o dia de hoje é registrado como um dia de acesso na meta semanal.
  useEffect(() => {
    const timer = setTimeout(() => {
      registerAccessAndGetWeeklyGoal()
        .then((result) => { if (result) setWeeklyGoal(result) })
        .catch(() => { /* sem conexão com o servidor, tenta de novo na próxima visita */ })
    }, MINUTES_TO_COUNT_ACCESS * 60 * 1000)

    return () => clearTimeout(timer)
  }, [])

  const notifications = useMemo(() => {
    const items: { id: string; text: string }[] = []
    const recentMaterial = materials[0]
    if (recentMaterial) {
      const addedDaysAgo = (Date.now() - new Date(recentMaterial.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      if (addedDaysAgo <= 7) items.push({ id: `material-${recentMaterial.id}`, text: `Novo material disponível: "${recentMaterial.title}"` })
    }
    if (weeklyGoal) {
      const faltam = weeklyGoal.goal - weeklyGoal.completedDates.length
      if (faltam > 0) items.push({ id: 'meta-semanal', text: `Faltam ${faltam} dia(s) de estudo para bater sua meta semanal.` })
      else items.push({ id: 'meta-ok', text: 'Você já bateu sua meta semanal. Parabéns! 🎉' })
    }
    items.push({ id: 'mentoria', text: 'Quer tirar dúvidas com a Carla? Marque uma mentoria individual.' })
    return items
  }, [materials, weeklyGoal])

  function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = '' // permite escolher o mesmo arquivo de novo depois
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setPhotoError('Escolha um arquivo de imagem (JPG, PNG ou WEBP).')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setPhotoError('Essa imagem é muito grande. Escolha uma foto de até 2MB.')
      return
    }

    setPhotoError('')
    setUploadingPhoto(true)

    const reader = new FileReader()
    reader.onload = async () => {
      const dataUrl = reader.result as string
      try {
        await saveMyProfilePhoto({ data: { dataUrl } })
        setPhotoUrl(dataUrl)
      } catch (error) {
        setPhotoError(error instanceof Error ? error.message : 'Não foi possível salvar a foto.')
      } finally {
        setUploadingPhoto(false)
      }
    }
    reader.onerror = () => {
      setPhotoError('Não foi possível ler o arquivo. Tente outra imagem.')
      setUploadingPhoto(false)
    }
    reader.readAsDataURL(file)
  }

  return (
    <main className="student-app">
      <aside className={sidebarOpen ? 'student-sidebar open' : 'student-sidebar'}>
        <div className="sidebar-head"><Link className="dashboard-brand" to="/"><span className="brand-mark"><img src="/logo-icone.png" alt="CPM" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></span><span><b>Carla Patrícia</b><small>Área do aluno</small></span></Link><button onClick={() => setSidebarOpen(false)}><X /></button></div>
        <nav>{sidebarItems.map(({ icon: Icon, label, href }, index) => <a className={index === 0 ? 'active' : ''} href={href} key={label}><Icon />{label}{label === 'Redações' && <i>2</i>}</a>)}
          {isAdmin && <Link to="/admin"><Settings />Painel admin</Link>}
        </nav>
        <div className="sidebar-help"><MessageSquareText /><b>Precisa de ajuda?</b><p>Nossa equipe está por perto.</p><a href="mailto:contato@carlapatriciamedina.com.br">Falar com suporte</a></div>
        <button className="logout" onClick={() => void logout()}><LogOut /> Sair da conta</button>
      </aside>

      <section className="student-main" id="top">
        <header className="dashboard-topbar"><button className="dashboard-menu" onClick={() => setSidebarOpen(true)}><Menu /></button><div className="dashboard-search"><Search /><input placeholder="Buscar aulas, materiais, temas..." value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} /></div><div className="topbar-actions"><div style={{ position: 'relative' }}>
          <button type="button" onClick={() => setNotificationsOpen((open) => !open)}><Bell />{notifications.length > 0 && <i />}</button>
          {notificationsOpen && (
            <div className="notifications-panel">
              <b>Avisos</b>
              {notifications.length === 0 && <p>Nenhum aviso por enquanto.</p>}
              {notifications.map((notification) => <p key={notification.id}>{notification.text}</p>)}
            </div>
          )}
        </div><div className="user-chip">
          <button type="button" className="avatar-edit-button" onClick={() => photoInputRef.current?.click()} disabled={uploadingPhoto} title="Trocar foto de perfil">
            <img src={photoUrl || DEFAULT_AVATAR} alt="Perfil" />
            <span className="avatar-edit-overlay">{uploadingPhoto ? '...' : '✎'}</span>
          </button>
          <input ref={photoInputRef} type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: 'none' }} />
          <span><b>{studentName} </b><small>Estudante · Redação</small></span><ChevronRight />
        </div><button className="topbar-logout" onClick={() => void logout()} title="Sair da conta"><LogOut /></button></div></header>
        {photoError && <p className="avatar-edit-error">{photoError}</p>}

        <div className="dashboard-content">
          <div className="welcome-row"><div><span>{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }).toUpperCase()}</span><h1>Olá, {studentName}! <span>✦</span></h1><p>Você está construindo um excelente ritmo. Continue assim!</p></div><Link className="outline-button" to="/mentorias"><CalendarDays /> Ver calendário</Link></div>

          <section className="dashboard-hero-card"><div><span className="pill"><Zap /> Sua jornada</span><h2>Faltam <em>{diasParaEnem()} dias</em> para a Prova da FMC.</h2><p>Cada aula concluída hoje deixa você mais perto da aprovação.</p><Link to="/aulas">Continuar estudando <CirclePlay /></Link></div><div className="hero-ring"><div><b>76%</b><span>progresso geral</span></div></div><div className="dashboard-decoration">A+</div></section>

          <div className="dashboard-grid">
            <section className="dashboard-card progress-card"><div className="card-title"><div><span>Meu progresso</span><h3>Visão geral</h3></div><button type="button" onClick={() => alert('Em breve: mais opções de personalização do progresso.')}><MoreHorizontal /></button></div><div className="progress-list">
              {contentCounts ? [
                ['Aulas em vídeo', `${contentCounts.aulas} aula${contentCounts.aulas === 1 ? '' : 's'} disponíveis`, contentCounts.aulas, '#6d28d9'],
                ['Materiais', `${contentCounts.materiais} arquivo${contentCounts.materiais === 1 ? '' : 's'} disponíveis`, contentCounts.materiais, '#0f7890'],
                ['Biblioteca de conteúdos', `${Object.values(contentCounts.bibliotecas).reduce((a, b) => a + b, 0)} arquivo(s) disponíveis`, Object.values(contentCounts.bibliotecas).reduce((a, b) => a + b, 0), '#c8a24d'],
              ].map(([title, detail, value, color]) => {
                const maxValue = Math.max(1, contentCounts.aulas, contentCounts.materiais, Object.values(contentCounts.bibliotecas).reduce((a, b) => a + b, 0))
                const percent = Math.round((Number(value) / maxValue) * 100)
                return <div key={title as string}><span><b>{title}</b><small>{detail}</small></span><div><i style={{ width: `${percent}%`, background: color }} /></div><strong>{value}</strong></div>
              }) : <p className="material-intro">Carregando...</p>}
            </div><Link to="/progresso">Ver relatório completo <ChevronRight /></Link></section>

            <section className="dashboard-card next-class"><div className="card-title"><div><span>Próxima aula</span><h3>Hoje, às 19h</h3></div><span className="live-dot">Ao vivo</span></div><div className="class-thumb"><img src="https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=900&q=85" alt="Caderno de estudos" /><span><CirclePlay /></span></div><small>MÓDULO 04 · REDAÇÃO</small><h4>Projeto de texto: da tese à conclusão</h4><p><Clock3 /> 1h30 de duração · Prof.ª Carla</p><a href={WHATSAPP_LINK} target="_blank" rel="noreferrer">Entrar na aula <ChevronRight /></a></section>

            <section className="dashboard-card weekly-goal"><div className="card-title"><div><span>Meta semanal</span><h3>{weeklyGoal ? weeklyGoal.completedDates.length : 0} de {weeklyGoal ? weeklyGoal.goal : 5} dias de estudo</h3></div><Trophy /></div><div className="week-days">{(weeklyGoal ? weeklyGoal.dates : []).map((date, index) => {
              const isDone = weeklyGoal?.completedDates.includes(date)
              const isToday = date === new Date().toISOString().slice(0, 10)
              const dayNumber = Number(date.slice(8, 10))
              return (
                <span className={isDone ? 'done' : isToday ? 'today' : ''} key={date}>
                  <i>{isDone ? '✓' : dayNumber}</i>
                  <small>{WEEKDAY_LETTERS[index]}</small>
                </span>
              )
            })}</div><p>{weeklyGoal && weeklyGoal.completedDates.length >= weeklyGoal.goal ? 'Você completou sua meta semanal! 🎉' : weeklyGoal ? `Você está a ${weeklyGoal.goal - weeklyGoal.completedDates.length} dia(s) de completar sua meta!` : 'Carregando sua meta semanal...'}</p></section>

            <section className="dashboard-card recent-content"><div className="card-title"><div><span>Continue de onde parou</span><h3>Últimas aulas</h3></div><Link to="/aulas">Ver todas</Link></div>
              {filteredRecent.map(([title, info, time], index) => <div className="recent-item" key={title}><span className={`recent-icon icon-${index}`}><BookOpen /></span><div><b>{title}</b><small>{info}</small></div><span><Clock3 />{time}</span><Link to="/aulas"><CirclePlay /></Link></div>)}
              {query && filteredRecent.length === 0 && <p className="material-intro">Nenhuma aula encontrada para "{searchQuery}".</p>}
            </section>

            <section className="dashboard-card material-card" id="materiais">
              <div className="card-title">
                <div><span>Arquivos exclusivos</span><h3>Material protegido</h3></div>
                <ShieldCheck />
              </div>
              <p className="material-intro">Baixe os materiais do curso enviados pela professora, em Word ou PDF. Cada download é protegido com seu nome e CPF.</p>
              {materialsError && <p className="avatar-edit-error">{materialsError}</p>}
              <div className="material-list">
                {filteredMaterials.map((material) => (
                  <div className="material-item" key={material.id}>
                    <div className="material-badge" style={{ background: `${material.accent}1a`, color: material.accent }}>{material.tag}</div>
                    <div>
                      <b>{material.title}</b>
                      <small>{material.description}</small>
                    </div>
                    <button onClick={() => handleDownload(material.id)} disabled={downloadingId === material.id}>
                      <Download /> {downloadingId === material.id ? 'Baixando...' : 'Baixar'}
                    </button>
                  </div>
                ))}
                {materials.length === 0 && <p className="material-intro">Nenhum material disponível ainda. A professora vai adicionar em breve.</p>}
                {query && materials.length > 0 && filteredMaterials.length === 0 && <p className="material-intro">Nenhum material encontrado para "{searchQuery}".</p>}
              </div>
            </section>

            <section className="dashboard-card correction-card"><div className="card-title"><div><span>Redação corrigida</span><h3>Inteligência artificial e sociedade</h3></div><span className="grade">920</span></div><p>Seu texto demonstrou excelente domínio da proposta. Há uma nova correção pronta para você.</p><div className="competencies">{[180,200,160,180,200].map((score, index) => <span key={index}><i style={{ height: `${score / 2.2}%` }} /><small>C{index + 1}</small><b>{score}</b></span>)}</div><Link to="/redacoes">Ver correção detalhada <ChevronRight /></Link></section>
          </div>
        </div>
      </section>
    </main>
  )
}