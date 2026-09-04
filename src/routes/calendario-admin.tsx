import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { useEffect, useState, type FormEvent } from 'react'
import { readLocalUser } from '@/lib/identity-context'
import { getServerUser } from '@/lib/auth'
import { userHasRole } from '@/lib/roles'
import {
  CALENDAR_EVENT_LABELS,
  CALENDAR_EVENT_TYPES,
  createCalendarEvent,
  deleteCalendarEvent,
  listCalendarEvents,
  updateCalendarEvent,
  type CalendarEvent,
  type CalendarEventType,
} from '@/lib/calendario'
import { useToast } from '@/lib/toast'

export const Route = createFileRoute('/calendario-admin')({
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
  component: CalendarioAdminPage,
})

const EMPTY_FORM = { date: '', time: '', type: 'aula-ao-vivo' as CalendarEventType, title: '', link: '' }

function CalendarioAdminPage() {
  const showToast = useToast()
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(EMPTY_FORM)
  // Quando tem id, o formulário está editando um evento existente em vez de criar.
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    try {
      setEvents(await listCalendarEvents())
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Não foi possível carregar a agenda.', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  function resetForm() {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setError('')
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')

    if (!form.title.trim()) {
      setError('Escreva o que acontece nesse dia.')
      return
    }
    if (!form.date) {
      setError('Escolha a data.')
      return
    }

    setSaving(true)
    try {
      if (editingId) {
        await updateCalendarEvent({ data: { id: editingId, ...form } })
        showToast('Evento atualizado.')
      } else {
        await createCalendarEvent({ data: form })
        showToast('Evento adicionado à agenda.')
      }
      resetForm()
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar o evento.')
    } finally {
      setSaving(false)
    }
  }

  function handleEdit(event: CalendarEvent) {
    setEditingId(event.id)
    setForm({ date: event.date, time: event.time, type: event.type, title: event.title, link: event.link })
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleDelete(id: string) {
    try {
      await deleteCalendarEvent({ data: { id } })
      if (editingId === id) resetForm()
      await load()
      showToast('Evento excluído.')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Não foi possível excluir o evento.', 'error')
    }
  }

  return (
    <main className="panel">
      <Link to="/admin" className="panel-back">← Voltar ao painel admin</Link>
      <h1>Calendário do curso</h1>
      <p className="panel-subtitle">
        Marque aulas ao vivo, liberação de aulas gravadas, simulados e simuladões. Os alunos veem tudo isso no calendário
        deles. As mentorias entram sozinhas — continue cadastrando elas em Mentoria individual e Mentorias em grupo.
      </p>

      <form onSubmit={handleSubmit} className="calendar-admin-form">
        <div className="field">
          <label htmlFor="evento-data">Data</label>
          <input
            id="evento-data"
            type="date"
            value={form.date}
            onChange={(event) => setForm({ ...form, date: event.target.value })}
          />
        </div>

        <div className="field">
          <label htmlFor="evento-hora">Horário <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(opcional)</span></label>
          <input
            id="evento-hora"
            type="time"
            value={form.time}
            onChange={(event) => setForm({ ...form, time: event.target.value })}
          />
        </div>

        <div className="field">
          <label htmlFor="evento-tipo">Tipo</label>
          <select
            id="evento-tipo"
            value={form.type}
            onChange={(event) => setForm({ ...form, type: event.target.value as CalendarEventType })}
          >
            {CALENDAR_EVENT_TYPES.map((type) => (
              <option key={type} value={type}>{CALENDAR_EVENT_LABELS[type]}</option>
            ))}
          </select>
        </div>

        <div className="field calendar-admin-wide">
          <label htmlFor="evento-titulo">O que acontece</label>
          <input
            id="evento-titulo"
            type="text"
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
            placeholder="Ex.: Simuladão de Redação — tema surpresa"
          />
        </div>

        <div className="field calendar-admin-wide">
          <label htmlFor="evento-link">Link <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(opcional — Zoom, material de apoio)</span></label>
          <input
            id="evento-link"
            type="url"
            value={form.link}
            onChange={(event) => setForm({ ...form, link: event.target.value })}
            placeholder="https://..."
          />
        </div>

        <div className="calendar-admin-actions">
          <button type="submit" disabled={saving} className="btn btn-primary">
            {saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Adicionar à agenda'}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm} className="btn btn-ghost">Cancelar edição</button>
          )}
        </div>
      </form>
      {error && <p className="form-error">{error}</p>}

      <section>
        <h2 className="panel-section-title">Agenda cadastrada</h2>
        {loading && <p className="panel-subtitle">Carregando...</p>}

        <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
          {events.map((event) => (
            <div key={event.id} className="list-row">
              <div>
                <div className="list-title">{event.title}</div>
                <div className="list-meta">
                  {CALENDAR_EVENT_LABELS[event.type]} · {event.date}
                  {event.time && ` às ${event.time}`}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => handleEdit(event)} className="btn btn-ghost btn-sm">Editar</button>
                <button onClick={() => handleDelete(event.id)} className="btn btn-danger btn-sm">Excluir</button>
              </div>
            </div>
          ))}
          {!loading && events.length === 0 && (
            <p className="empty-state">Nenhum evento na agenda ainda.</p>
          )}
        </div>
      </section>
    </main>
  )
}
