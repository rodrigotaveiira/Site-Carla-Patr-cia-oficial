import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import {
  Award, Bell, BookCheck, BookMarked, BookOpen, CalendarCheck, CalendarDays, ChevronRight, CircleHelp, CirclePlay,
  Clock3, Download, FileCheck2, Files, Library, LogOut,
  MoreHorizontal, PenLine, Search, Target, Trophy, Zap,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { readLocalUser, useIdentity } from '@/lib/identity-context'
import { getServerUser } from '@/lib/auth'
import { userHasRole, isStaff } from '@/lib/roles'
import { getMyProfilePhoto, saveMyProfilePhoto } from '@/lib/profile-photo'
import { getMonthlyActivity, getStreak, getWeeklyGoal, registerAccessAndGetWeeklyGoal, type MonthlyActivity, type WeeklyGoal } from '@/lib/weekly-activity'
import { getMaterialFile, listMaterials, type MaterialListItem } from '@/lib/materials'
import { getStudentProgress, REDACOES_META_PROGRESSO, type StudentProgress } from '@/lib/progress'
import { listMyRedacoes, type RedacaoSubmission } from '@/lib/redacoes'
import { getCompetencyScheme, type Competency } from '@/lib/competencies'
import { listLembretes, type Lembrete } from '@/lib/lembretes'
import { getLiveClass, type LiveClass } from '@/lib/live-class'
import { getRecentContentNotifications, type ContentNotification } from '@/lib/notifications'
import { searchContent, type SearchResult, type SearchResultType } from '@/lib/search'
import { downloadAchievementImage } from '@/lib/achievement-image'
import { useToast } from '@/lib/toast'
import { OnboardingModal } from '@/components/OnboardingModal'
import { MonthReviewModal } from '@/components/MonthReviewModal'

const WHATSAPP_LINK = 'https://wa.me/5522999325306'

type MaterialMeta = MaterialListItem

// Tempo mínimo que o aluno precisa ficar na plataforma para o dia contar na meta semanal.
const MINUTES_TO_COUNT_ACCESS = 5

// Tempo de inatividade (sem tocar na tela/teclado/mouse) até deslogar o aluno automaticamente.
const INACTIVITY_LIMIT_MINUTES = 15

// Selo de "excelência sustentada": todas as redações corrigidas nos últimos
// EXCELLENCE_WINDOW_DAYS dias precisam ter nota acima de EXCELLENCE_GRADE_THRESHOLD.
const EXCELLENCE_GRADE_THRESHOLD = 35
const EXCELLENCE_WINDOW_DAYS = 30

export const Route = createFileRoute('/_app/dashboard')({
  beforeLoad: async () => {
    if (typeof window !== 'undefined') {
      const localUser = readLocalUser()
      if (localUser) return { user: localUser }
    }

    const user = await getServerUser()
    if (!user) throw redirect({ to: '/login', search: { debug: 'sem-usuario-no-servidor' } })
    if (!userHasRole(user, 'aprovado') && !isStaff(user)) {
      throw redirect({
        to: '/aguardando-aprovacao',
        search: { debug: JSON.stringify(user, null, 2) },
      })
    }
    return { user }
  },
  component: DashboardPage,
})

async function downloadMaterial(id: string) {
  const { fileName, fileDataUrl } = await getMaterialFile({ data: { id } })
  const link = document.createElement('a')
  link.download = fileName
  link.href = fileDataUrl
  link.click()
}

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80'

const SEARCH_TYPE_ICON: Record<SearchResultType, typeof BookOpen> = {
  aula: BookOpen,
  material: Files,
  tema: PenLine,
  simulado: Target,
  biblioteca: Library,
  questoes: CircleHelp,
  simulados: FileCheck2,
  repertorios: BookMarked,
  dicas: Zap,
  gabaritos: BookCheck,
}

// Tempo de espera depois que o aluno para de digitar até disparar a busca real no servidor.
const SEARCH_DEBOUNCE_MS = 300

const ENEM_DATE = new Date('2026-11-22T00:00:00')
const WEEKDAY_LETTERS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'] // segunda a domingo

function diasParaEnem() {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const diffMs = ENEM_DATE.getTime() - hoje.getTime()
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
}

// Formata a data/hora da aula ao vivo de forma amigável: "Hoje, às 19h", "Amanhã, às 19h" ou "23/08, às 19h".
function formatClassDateTime(dateTime: string): string {
  const classDate = new Date(dateTime)
  if (Number.isNaN(classDate.getTime())) return dateTime

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const classDayOnly = new Date(classDate)
  classDayOnly.setHours(0, 0, 0, 0)

  const time = classDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  if (classDayOnly.getTime() === today.getTime()) return `Hoje, às ${time}`
  if (classDayOnly.getTime() === tomorrow.getTime()) return `Amanhã, às ${time}`
  return `${classDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}, às ${time}`
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours === 0) return `${mins}min`
  if (mins === 0) return `${hours}h`
  return `${hours}h${mins}min`
}

function DashboardPage() {
  const { user, logout } = useIdentity()
  const showToast = useToast()
  const studentName = user?.name || ' '
  const isAdmin = userHasRole(user, 'admin')
  const isProfessor = userHasRole(user, 'professor') && !isAdmin

  const [showOnboarding, setShowOnboarding] = useState(false)
  useEffect(() => {
    if (isAdmin || isProfessor || !user?.email) return
    const key = `cpm:onboarding-seen:${user.email.toLowerCase()}`
    if (!localStorage.getItem(key)) setShowOnboarding(true)
  }, [isAdmin, isProfessor, user?.email])

  function dismissOnboarding() {
    if (user?.email) localStorage.setItem(`cpm:onboarding-seen:${user.email.toLowerCase()}`, '1')
    setShowOnboarding(false)
  }

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

  const [studentProgress, setStudentProgress] = useState<StudentProgress | null>(null)
  useEffect(() => {
    getStudentProgress().then(setStudentProgress).catch(() => { /* mantém null, anel mostra "..." */ })
  }, [])

  const [liveClass, setLiveClass] = useState<LiveClass | null | undefined>(undefined)
  useEffect(() => {
    getLiveClass().then(setLiveClass).catch(() => setLiveClass(null))
  }, [])

  const [latestCorrection, setLatestCorrection] = useState<Omit<RedacaoSubmission, 'fileDataUrl'> | null | undefined>(undefined)
  const [excellenceBadge, setExcellenceBadge] = useState(false)
  useEffect(() => {
    listMyRedacoes()
      .then((list) => {
        const corrected = list.filter((s) => s.status === 'corrigida').sort((a, b) => (b.correctedAt ?? '').localeCompare(a.correctedAt ?? ''))
        setLatestCorrection(corrected[0] ?? null)

        const cutoff = Date.now() - EXCELLENCE_WINDOW_DAYS * 24 * 60 * 60 * 1000
        const recent = corrected.filter((s) => s.correctedAt && new Date(s.correctedAt).getTime() >= cutoff)
        setExcellenceBadge(recent.length > 0 && recent.every((s) => (s.grade ?? 0) > EXCELLENCE_GRADE_THRESHOLD))
      })
      .catch(() => setLatestCorrection(null))
  }, [])

  const [generatingBadgeImage, setGeneratingBadgeImage] = useState(false)
  async function handleDownloadBadge() {
    setGeneratingBadgeImage(true)
    try {
      await downloadAchievementImage(studentName.trim() || 'Aluno(a)', EXCELLENCE_GRADE_THRESHOLD, EXCELLENCE_WINDOW_DAYS)
    } finally {
      setGeneratingBadgeImage(false)
    }
  }

  const [competencyScheme, setCompetencyScheme] = useState<Competency[]>([])
  useEffect(() => {
    getCompetencyScheme().then(setCompetencyScheme).catch(() => { /* quadro mostra as barras vazias */ })
  }, [])

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const searchBoxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const trimmed = searchQuery.trim()
    if (trimmed.length < 2) {
      setSearchResults([])
      setSearching(false)
      return
    }

    setSearching(true)
    const timer = setTimeout(() => {
      searchContent({ data: { query: trimmed } })
        .then(setSearchResults)
        .catch(() => setSearchResults([]))
        .finally(() => setSearching(false))
    }, SEARCH_DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Fecha o dropdown de resultados ao clicar fora da caixa de busca.
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchBoxRef.current && !searchBoxRef.current.contains(event.target as Node)) {
        setSearchOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
  const [streak, setStreak] = useState<number | null>(null)
  const [monthly, setMonthly] = useState<MonthlyActivity | null>(null)
  const [monthOpen, setMonthOpen] = useState(false)
  const [monthLoading, setMonthLoading] = useState(false)

  function openMonthReview() {
    setMonthOpen(true)
    if (monthly) return
    setMonthLoading(true)
    getMonthlyActivity()
      .then((result) => { if (result) setMonthly(result) })
      .catch(() => { /* sem conexão com o servidor, o modal mostra um aviso */ })
      .finally(() => setMonthLoading(false))
  }

  // Ao abrir o dashboard, só exibe a meta semanal já salva — ainda não marca o dia de hoje.
  useEffect(() => {
    getWeeklyGoal()
      .then((result) => { if (result) setWeeklyGoal(result) })
      .catch(() => { /* sem conexão com o servidor, o card usa o estado padrão */ })
    getStreak()
      .then(setStreak)
      .catch(() => { /* sem conexão com o servidor, o badge de sequência some */ })
  }, [])

  // Só depois que o aluno fica MINUTES_TO_COUNT_ACCESS minutos com a aba aberta,
  // o dia de hoje é registrado como um dia de acesso na meta semanal.
  useEffect(() => {
    const timer = setTimeout(() => {
      registerAccessAndGetWeeklyGoal()
        .then((result) => { if (result) setWeeklyGoal(result) })
        .catch(() => { /* sem conexão com o servidor, tenta de novo na próxima visita */ })
      getStreak().then(setStreak).catch(() => { /* mantém o valor anterior */ })
    }, MINUTES_TO_COUNT_ACCESS * 60 * 1000)

    return () => clearTimeout(timer)
  }, [])

  const [lembretes, setLembretes] = useState<Lembrete[]>([])
  useEffect(() => {
    listLembretes().then(setLembretes).catch(() => { /* sem lembretes por enquanto */ })
  }, [])

  const [contentNotifications, setContentNotifications] = useState<ContentNotification[]>([])
  useEffect(() => {
    getRecentContentNotifications().then(setContentNotifications).catch(() => { /* sem avisos de arquivo por enquanto */ })
  }, [])

  const notifications = useMemo(() => {
    const items: { id: string; text: string }[] = []
    for (const lembrete of lembretes) {
      items.push({ id: `lembrete-${lembrete.id}`, text: lembrete.message })
    }
    for (const notification of contentNotifications) {
      items.push({ id: notification.id, text: notification.text })
    }
    if (weeklyGoal) {
      const faltam = weeklyGoal.goal - weeklyGoal.completedDates.length
      if (faltam > 0) items.push({ id: 'meta-semanal', text: `Faltam ${faltam} dia(s) de estudo para bater sua meta semanal.` })
      else items.push({ id: 'meta-ok', text: 'Você já bateu sua meta semanal. Parabéns! 🎉' })
    }
    items.push({ id: 'mentoria', text: 'Quer tirar dúvidas com a Carla? Marque um encontro individual.' })
    return items
  }, [weeklyGoal, lembretes, contentNotifications])

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

  // Troféu da meta semanal: prata a partir de 3 dias, dourado só quando a meta (5 dias) é batida.
  const weeklyDaysDone = weeklyGoal ? weeklyGoal.completedDates.length : 0

  return (
    <>
      {showOnboarding && <OnboardingModal studentName={studentName.trim() || 'Aluno(a)'} onDismiss={dismissOnboarding} />}
      {monthOpen && monthly && <MonthReviewModal monthly={monthly} onClose={() => setMonthOpen(false)} />}
      {monthOpen && !monthly && monthLoading && (
        <div className="onboarding-overlay" role="dialog" aria-modal="true" onClick={() => setMonthOpen(false)}>
          <div className="month-review-modal month-review-loading" onClick={(event) => event.stopPropagation()}>
            <p>Carregando seu mês...</p>
          </div>
        </div>
      )}
      <header className="dashboard-topbar"><div className="dashboard-search" ref={searchBoxRef}>
        <Search />
        <input
          placeholder="Buscar aulas, materiais, temas..."
          value={searchQuery}
          onChange={(event) => { setSearchQuery(event.target.value); setSearchOpen(true) }}
          onFocus={() => setSearchOpen(true)}
        />
        {searchOpen && searchQuery.trim().length >= 2 && (
          <div className="search-results">
            {searching && <p className="search-results-status">Buscando...</p>}
            {!searching && searchResults.length === 0 && (
              <p className="search-results-status">Nenhum resultado para "{searchQuery.trim()}".</p>
            )}
            {!searching && searchResults.map((result) => {
              const Icon = SEARCH_TYPE_ICON[result.type]
              return (
                <Link key={result.id} to={result.href} className="search-result" onClick={() => setSearchOpen(false)}>
                  <Icon />
                  <div><b>{result.title}</b><small>{result.subtitle}</small></div>
                </Link>
              )
            })}
          </div>
        )}
      </div><div className="topbar-actions"><div style={{ position: 'relative' }}>
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

        <section className="dashboard-hero-card"><div><span className="pill"><Zap /> Sua jornada</span><h2>Faltam <em>{diasParaEnem()} dias</em> para a Prova da FMC.</h2><p>Cada aula concluída hoje deixa você mais perto da aprovação.</p><Link to="/aulas">Continuar estudando <CirclePlay /></Link></div><div className="hero-ring" style={{ background: `conic-gradient(#d7b95e 0 ${studentProgress?.overallPercent ?? 0}%, #ffffff18 ${studentProgress?.overallPercent ?? 0}% 100%)` }}><div><b>{studentProgress ? `${studentProgress.overallPercent}%` : '...'}</b><span>progresso geral</span></div></div><div className="dashboard-decoration">A+</div></section>

        {excellenceBadge && (
          <section className="achievement-banner">
            <span className="achievement-icon"><Award /></span>
            <div>
              <b>Excelência sustentada</b>
              <p>Todas as suas redações corrigidas nos últimos {EXCELLENCE_WINDOW_DAYS} dias tiveram nota acima de {EXCELLENCE_GRADE_THRESHOLD}. Continue assim! 🎉</p>
            </div>
            <button type="button" className="achievement-share" onClick={handleDownloadBadge} disabled={generatingBadgeImage}>
              <Download size={15} /> {generatingBadgeImage ? 'Gerando...' : 'Baixar imagem'}
            </button>
          </section>
        )}

        <div className="dashboard-grid">
          <section className="dashboard-card progress-card"><div className="card-title"><div><span>Meu progresso</span><h3>Visão geral</h3></div><button type="button" onClick={() => showToast('Em breve: mais opções de personalização do progresso.', 'info')}><MoreHorizontal /></button></div><div className="progress-list">
            {studentProgress ? [
              ['Aulas assistidas', `${studentProgress.aulasAssistidas} de ${studentProgress.aulasDisponiveis} aulas`, studentProgress.aulasPercent, '#6d28d9'],
              ['Redações entregues', `${studentProgress.redacoesEntregues} de ${REDACOES_META_PROGRESSO} redações`, studentProgress.redacoesPercent, '#0f7890'],
            ].map(([title, detail, percent, color]) => (
              // A barra só sobe de acordo com o progresso real do aluno (aulas assistidas e
              // redações entregues) — não com a quantidade de conteúdo disponível na plataforma.
              <div key={title as string}><span><b>{title}</b><small>{detail}</small></span><div><i style={{ width: `${percent}%`, background: color }} /></div><strong>{percent}%</strong></div>
            )) : Array.from({ length: 2 }).map((_, index) => (
              <div key={index} style={{ display: 'grid', gridTemplateColumns: '105px 1fr 34px', alignItems: 'center', gap: 13 }}>
                <div className="skeleton skeleton-line sm" style={{ width: '75%' }} />
                <div className="skeleton" style={{ height: 5, borderRadius: 4 }} />
                <div className="skeleton skeleton-line sm" style={{ width: 24 }} />
              </div>
            ))}
          </div><Link to="/progresso">Ver relatório completo <ChevronRight /></Link></section>

          {liveClass === undefined ? (
            <section className="dashboard-card next-class">
              <div className="card-title"><div><span>Próxima aula</span></div></div>
              <div className="skeleton skeleton-block" style={{ height: 120, margin: '18px 0' }} />
              <div className="skeleton skeleton-line sm w-40" />
              <div className="skeleton skeleton-line lg w-80" style={{ marginTop: 10 }} />
              <div className="skeleton skeleton-block" style={{ height: 38, marginTop: 15 }} />
            </section>
          ) : liveClass === null ? (
            <section className="dashboard-card next-class"><div className="card-title"><div><span>Próxima aula</span><h3>Nenhuma aula agendada</h3></div></div><p style={{ padding: '0 20px 20px' }}>Assim que a professora agendar a próxima aula ao vivo, ela aparece aqui.</p></section>
          ) : (
            <section className="dashboard-card next-class">
              <div className="card-title"><div><span>Próxima aula</span><h3>{formatClassDateTime(liveClass.dateTime)}</h3></div><span className="live-dot">Ao vivo</span></div>
              <div className="class-thumb"><img src="https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=900&q=85" alt="Caderno de estudos" /><span><CirclePlay /></span></div>
              <small>{liveClass.module.toUpperCase()}</small>
              <h4>{liveClass.title}</h4>
              <p><Clock3 /> {formatDuration(liveClass.durationMinutes)} de duração · Prof.ª Carla</p>
              {liveClass.zoomLink ? (
                <a href={liveClass.zoomLink} target="_blank" rel="noreferrer">Entrar na aula <ChevronRight /></a>
              ) : (
                <a href={WHATSAPP_LINK} target="_blank" rel="noreferrer">Entrar na aula <ChevronRight /></a>
              )}
            </section>
          )}

          <section className="dashboard-card weekly-goal"><div className="card-title"><div><span>Meta semanal</span><h3>{weeklyGoal ? weeklyGoal.completedDates.length : 0} de {weeklyGoal ? weeklyGoal.goal : 5} dias de estudo</h3></div>{streak && streak > 1 ? (
            <span className="streak-badge">✒️ {streak}</span>
          ) : weeklyDaysDone >= 5 ? (
            <span className="trophy-chip"><Trophy size={15} /> {weeklyDaysDone}</span>
          ) : weeklyDaysDone >= 3 ? (
            <span className="trophy-chip silver"><Trophy size={15} /> {weeklyDaysDone}</span>
          ) : null}</div><div className="week-days">{weeklyGoal ? weeklyGoal.dates.map((date, index) => {
            const isDone = weeklyGoal?.completedDates.includes(date)
            const isToday = date === new Date().toISOString().slice(0, 10)
            const dayNumber = Number(date.slice(8, 10))
            return (
              <span className={isDone ? 'done' : isToday ? 'today' : ''} key={date}>
                <i>{isDone ? <PenLine size={15} /> : dayNumber}</i>
                <small>{WEEKDAY_LETTERS[index]}</small>
              </span>
            )
          }) : Array.from({ length: 7 }).map((_, index) => (
            <span key={index}>
              <span className="skeleton skeleton-circle" style={{ width: 28, height: 28, display: 'block' }} />
              <span className="skeleton skeleton-line sm" style={{ width: 14, height: 8, display: 'block', marginTop: 5 }} />
            </span>
          ))}</div>{weeklyGoal && weeklyGoal.completedDates.length >= weeklyGoal.goal ? (
            <p className="weekly-goal-success">🎉 Você completou sua meta semanal!</p>
          ) : weeklyGoal && weeklyGoal.goal - weeklyGoal.completedDates.length === 1 ? (
            <p className="weekly-goal-success">Só mais um dia de constância e essa semana é sua.</p>
          ) : weeklyGoal ? (
            <p>Você está a {weeklyGoal.goal - weeklyGoal.completedDates.length} dia(s) de completar sua meta!</p>
          ) : (
            <div className="skeleton skeleton-line sm w-60" style={{ marginTop: 4 }} />
          )}
          <button type="button" className="weekly-goal-month-link" onClick={openMonthReview}>
            <CalendarCheck size={14} /> Ver como foi meu mês <ChevronRight size={14} />
          </button>
          </section>

          <section className="dashboard-card recent-content"><div className="card-title"><div><span>Continue de onde parou</span><h3>Últimas aulas</h3></div><Link to="/aulas">Ver todas</Link></div>
            {recentContent.map(([title, info, time], index) => <div className="recent-item" key={title}><span className={`recent-icon icon-${index}`}><BookOpen /></span><div><b>{title}</b><small>{info}</small></div><span><Clock3 />{time}</span><Link to="/aulas"><CirclePlay /></Link></div>)}
          </section>

          <section className="dashboard-card material-card" id="materiais">
            <div className="card-title">
              <div><span>Arquivos exclusivos</span><h3>Material protegido</h3></div>
              <Link to="/materiais">Ver todos</Link>
            </div>
            <p className="material-intro">Baixe os materiais do curso enviados pela professora, em Word ou PDF. Cada download é protegido com seu nome e CPF.</p>
            {materialsError && <p className="avatar-edit-error">{materialsError}</p>}
            <div className="material-list">
              {materials.map((material) => (
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
            </div>
          </section>

          {latestCorrection === undefined ? (
            <section className="dashboard-card correction-card">
              <div className="card-title"><div><span>Redação corrigida</span></div></div>
              <div className="skeleton skeleton-line lg w-80" style={{ marginTop: 8 }} />
              <div className="skeleton skeleton-line w-full" style={{ marginTop: 14 }} />
              <div className="skeleton skeleton-line w-60" style={{ marginTop: 8 }} />
            </section>
          ) : (
            <section className="dashboard-card correction-card">
              <div className="card-title"><div><span>Redação corrigida</span><h3>{latestCorrection ? latestCorrection.title : 'Nenhuma correção ainda'}</h3></div>{latestCorrection && <span className="grade">{latestCorrection.grade}/40</span>}</div>
              <p>{latestCorrection ? (latestCorrection.feedback || 'Sua correção está pronta.') : 'Envie sua primeira redação para receber uma correção detalhada pelos critérios da banca Econ Rio.'}</p>
              <div className="competencies">{competencyScheme.map((competency) => {
                const score = latestCorrection?.competencyScores?.find((s) => s.id === competency.id)
                const value = score?.value ?? 0
                // Usa o maxValue guardado na própria nota (de quando ela foi corrigida), não o
                // esquema atual — evita a barra estourar se a professora editar os valores depois.
                const maxValue = score?.maxValue || competency.maxValue || 1
                const percent = Math.max(0, Math.min(100, (value / maxValue) * 100))
                // Mostra o nome inteiro da competência (quebrando em até 2 linhas) em vez de
                // cortar na primeira palavra — o rótulo curto ficava ilegível.
                return <span key={competency.id}><div className="bar-track"><i style={{ height: `${percent}%` }} /></div><small>{competency.label}</small><b>{score ? value : '–'}</b></span>
              })}</div>
              <Link to="/redacoes">{latestCorrection ? 'Ver correção detalhada' : 'Enviar redação'} <ChevronRight /></Link>
            </section>
          )}
        </div>
      </div>
    </>
  )
}
