import { createFileRoute, redirect } from '@tanstack/react-router'
import { CalendarDays, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { readLocalUser, useIdentity } from '@/lib/identity-context'
import { getServerUser } from '@/lib/auth'
import { userHasRole, isStaff } from '@/lib/roles'
import { CALENDAR_EVENT_LABELS, listCalendarEvents, type CalendarEvent, type CalendarEventType } from '@/lib/calendario'
import { listMentoriaSlots } from '@/lib/mentorias'
import { listMentoriaGrupoSlots } from '@/lib/mentorias-grupo'
import { EmptyState } from '@/components/EmptyState'
import { formatarHora } from '@/lib/formato'

export const Route = createFileRoute('/_app/calendario')({
  beforeLoad: async () => {
    if (typeof window !== 'undefined') {
      const localUser = readLocalUser()
      if (localUser) return { user: localUser }
    }

    const user = await getServerUser()
    if (!user) throw redirect({ to: '/login' })
    if (!userHasRole(user, 'aprovado') && !isStaff(user)) {
      throw redirect({ to: '/aguardando-aprovacao', search: { debug: undefined } })
    }
    return { user }
  },
  component: CalendarioPage,
})

// As mentorias entram na agenda junto com os eventos cadastrados pela Carla,
// então os dois viram o mesmo formato antes de ir pra tela.
type AgendaKind = CalendarEventType | 'mentoria' | 'mentoria-grupo'

type AgendaItem = {
  id: string
  date: string
  time: string
  kind: AgendaKind
  title: string
  link: string
}

const KIND_LABELS: Record<AgendaKind, string> = {
  ...CALENDAR_EVENT_LABELS,
  mentoria: 'Encontro individual',
  'mentoria-grupo': 'Mentoria em grupo',
}

// Uma cor por tipo, pro aluno bater o olho no mês e entender sem ler.
const KIND_COLORS: Record<AgendaKind, string> = {
  'aula-ao-vivo': '#6d28d9',
  aula: '#0f2d52',
  simulado: '#c8a24d',
  simuladao: '#b45309',
  outro: '#667085',
  mentoria: '#0e7490',
  'mentoria-grupo': '#15803d',
}

const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'] as const

// O pt-BR devolve mes e dia da semana em minusculo. Fazer isso no CSS nao serve:
// 'capitalize' viraria "02 De Setembro", e '::first-letter' nao se aplica em
// container flex, que e o caso do .panel-section-title.
function capitalizeFirst(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function toDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatLongDate(key: string) {
  const [year, month, day] = key.split('-').map(Number)
  return capitalizeFirst(new Date(year, month - 1, day).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  }))
}

function CalendarioPage() {
  const { user } = useIdentity()
  const [items, setItems] = useState<AgendaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const today = new Date()
  const todayKey = toDateKey(today)
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const [selected, setSelected] = useState(todayKey)

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError('')
      try {
        // As três fontes são independentes: se as mentorias falharem, os eventos
        // do mês ainda aparecem. Por isso allSettled em vez de Promise.all.
        const [eventsResult, mentoriasResult, gruposResult] = await Promise.allSettled([
          listCalendarEvents(),
          listMentoriaSlots(),
          listMentoriaGrupoSlots(),
        ])

        if (!active) return

        const merged: AgendaItem[] = []

        if (eventsResult.status === 'fulfilled') {
          for (const event of eventsResult.value as CalendarEvent[]) {
            merged.push({
              id: `evento-${event.id}`,
              date: event.date,
              time: event.time,
              kind: event.type,
              title: event.title,
              link: event.link,
            })
          }
        }

        // Só o que é do próprio aluno. A agenda nunca mostra a mentoria de outro.
        if (mentoriasResult.status === 'fulfilled') {
          for (const slot of mentoriasResult.value) {
            if (slot.status !== 'booked' || slot.student?.email !== user?.email) continue
            merged.push({
              id: `mentoria-${slot.id}`,
              date: slot.date,
              time: slot.time,
              kind: 'mentoria',
              title: `Encontro individual com a Carla · ${slot.duration} min`,
              link: '',
            })
          }
        }

        if (gruposResult.status === 'fulfilled') {
          for (const slot of gruposResult.value) {
            if (!slot.students.some((student) => student.email === user?.email)) continue
            merged.push({
              id: `grupo-${slot.id}`,
              date: slot.date,
              time: slot.time,
              kind: 'mentoria-grupo',
              title: `Mentoria em grupo · ${slot.duration} min`,
              link: '',
            })
          }
        }

        merged.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
        setItems(merged)

        if (eventsResult.status === 'rejected') {
          setError('Não foi possível carregar a agenda do curso. Suas mentorias continuam aparecendo abaixo.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [user?.email])

  const byDate = useMemo(() => {
    const map = new Map<string, AgendaItem[]>()
    for (const item of items) {
      const list = map.get(item.date)
      if (list) list.push(item)
      else map.set(item.date, [item])
    }
    return map
  }, [items])

  // Grade do mês, alinhada no domingo. Os dias de fora entram como null pra
  // manter as colunas certas sem virar dia clicável.
  const cells = useMemo(() => {
    const year = cursor.getFullYear()
    const month = cursor.getMonth()
    const firstWeekday = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    const result: (string | null)[] = Array.from({ length: firstWeekday }, () => null)
    for (let day = 1; day <= daysInMonth; day += 1) {
      result.push(toDateKey(new Date(year, month, day)))
    }
    return result
  }, [cursor])

  const monthLabel = capitalizeFirst(cursor.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }))
  const selectedItems = byDate.get(selected) ?? []
  const usedKinds = useMemo(() => [...new Set(items.map((item) => item.kind))], [items])

  function moveMonth(offset: number) {
    setCursor((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1))
  }

  return (
    <div className="panel">
      <h1 style={{ marginBottom: 4 }}>Calendário</h1>
      <p className="panel-subtitle">
        Suas mentorias marcadas e a agenda do curso — aulas ao vivo, aulas liberadas e simulados — no mesmo lugar.
      </p>

      {error && (
        <div className="form-error" style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 12, margin: '16px 0' }}>
          {error}
        </div>
      )}

      {loading && <p className="panel-subtitle" style={{ marginTop: 20 }}>Carregando...</p>}

      {!loading && (
        <>
          <div className="calendar-head">
            <button type="button" className="calendar-nav" onClick={() => moveMonth(-1)} aria-label="Mês anterior">
              <ChevronLeft size={16} />
            </button>
            <strong className="calendar-month">{monthLabel}</strong>
            <button type="button" className="calendar-nav" onClick={() => moveMonth(1)} aria-label="Próximo mês">
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="calendar-grid" role="grid">
            {WEEKDAYS.map((weekday) => (
              <div key={weekday} className="calendar-weekday">{weekday}</div>
            ))}

            {cells.map((key, index) => {
              if (!key) return <div key={`vazio-${index}`} className="calendar-cell is-empty" />

              const dayItems = byDate.get(key) ?? []
              const classes = ['calendar-cell']
              if (key === todayKey) classes.push('is-today')
              if (key === selected) classes.push('is-selected')
              if (dayItems.length > 0) classes.push('has-items')

              return (
                <button
                  key={key}
                  type="button"
                  className={classes.join(' ')}
                  onClick={() => setSelected(key)}
                  aria-pressed={key === selected}
                  aria-label={`${formatLongDate(key)}${dayItems.length ? ` — ${dayItems.length} evento(s)` : ''}`}
                >
                  <span className="calendar-day">{Number(key.slice(8))}</span>
                  <span className="calendar-dots">
                    {dayItems.slice(0, 4).map((item) => (
                      <i key={item.id} style={{ background: KIND_COLORS[item.kind] }} />
                    ))}
                  </span>
                </button>
              )
            })}
          </div>

          {usedKinds.length > 0 && (
            <div className="calendar-legend">
              {usedKinds.map((kind) => (
                <span key={kind}>
                  <i style={{ background: KIND_COLORS[kind] }} />
                  {KIND_LABELS[kind]}
                </span>
              ))}
            </div>
          )}

          <section>
            <h2 className="panel-section-title calendar-day-title">{formatLongDate(selected)}</h2>

            {selectedItems.length === 0 && (
              <EmptyState
                icon={CalendarDays}
                title="Nada marcado nesse dia"
                description="Escolha outro dia no calendário para ver o que está agendado."
              />
            )}

            <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
              {selectedItems.map((item) => (
                <div key={item.id} className="list-row">
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <span className="calendar-item-bar" style={{ background: KIND_COLORS[item.kind] }} />
                    <div>
                      <div className="list-title">{item.title}</div>
                      <div className="list-meta">
                        {KIND_LABELS[item.kind]}
                        {item.time && ` · ${formatarHora(item.time)}`}
                      </div>
                    </div>
                  </div>
                  {item.link && (
                    <a href={item.link} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
                      Abrir <ExternalLink size={13} />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
