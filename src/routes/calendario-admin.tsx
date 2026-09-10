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
import { formatarHora } from '@/lib/formato'
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

const EMPTY_CORRECTION = { date: '', time: '', endTime: '', link: '', description: '' }
const EMPTY_FORM = {
  date: '',
  time: '',
  endTime: '',
  type: 'aula-ao-vivo' as CalendarEventType,
  title: '',
  link: '',
  correction: EMPTY_CORRECTION,
}

function isSimuladoType(type: CalendarEventType) {
  return type === 'simulado' || type === 'simuladao'
}

// "18h" / "18h30 às 20h" — resumo de horário pra lista da agenda.
function resumoHorario(time: string, endTime: string) {
  if (!time) return ''
  return endTime ? `${formatarHora(time)} às ${formatarHora(endTime)}` : formatarHora(time)
}

function CalendarioAdminPage() {
  const showToast = useToast()
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(EMPTY_FORM)
  // Quando tem id, o formulário está editando um evento existente em vez de criar.
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const isSimulado = isSimuladoType(form.type)

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

  function setCorrection(patch: Partial<typeof EMPTY_CORRECTION>) {
    setForm((current) => ({ ...current, correction: { ...current.correction, ...patch } }))
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
    if (isSimulado && form.time && form.endTime && form.endTime <= form.time) {
      setError('O término da prova precisa ser depois do início.')
      return
    }
    const c = form.correction
    if (isSimulado && (c.time || c.endTime || c.link || c.description) && !c.date) {
      setError('Escolha a data da correção (ou limpe os campos da correção).')
      return
    }
    if (isSimulado && c.date && c.time && c.endTime && c.endTime <= c.time) {
      setError('O término da correção precisa ser depois do início.')
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
    setForm({
      date: event.date,
      time: event.time,
      endTime: event.endTime ?? '',
      type: event.type,
      title: event.title,
      link: event.link,
      correction: event.correction ?? { ...EMPTY_CORRECTION },
    })
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
      <p className="panel-subtitle">
        <strong>Simulado</strong> e <strong>Simuladão</strong> ganham destaque no calendário do aluno e disparam
        lembrete por e-mail automaticamente — na véspera às 18h e 30 minutos antes. A correção do simulado, quando
        cadastrada, entra na agenda e manda os mesmos lembretes.
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
          <label htmlFor="evento-hora">
            {isSimulado ? 'Início da prova' : 'Horário'} <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(opcional)</span>
          </label>
          <input
            id="evento-hora"
            type="time"
            value={form.time}
            onChange={(event) => setForm({ ...form, time: event.target.value })}
          />
          {isSimulado && !form.time && (
            <p className="field-hint" style={{ color: 'var(--muted)', fontSize: 12, margin: '6px 0 0' }}>
              Sem horário, o aluno só recebe o lembrete da véspera (18h). Preencha para enviar também o de 30 min antes.
            </p>
          )}
        </div>

        {isSimulado ? (
          <div className="field">
            <label htmlFor="evento-fim">Término da prova <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(opcional)</span></label>
            <input
              id="evento-fim"
              type="time"
              value={form.endTime}
              onChange={(event) => setForm({ ...form, endTime: event.target.value })}
            />
          </div>
        ) : null}

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

        {isSimulado ? (
          <fieldset className="calendar-admin-wide calendar-admin-fieldset">
            <legend>Correção do simulado <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(opcional)</span></legend>
            <p className="field-hint" style={{ color: 'var(--muted)', fontSize: 12, margin: '0 0 12px' }}>
              Preencha se houver uma aula de correção. Ela aparece como um item próprio na agenda do aluno e recebe os
              mesmos lembretes (véspera às 18h e 30 min antes).
            </p>
            <div className="calendar-admin-form" style={{ margin: 0 }}>
              <div className="field">
                <label htmlFor="correcao-data">Data da correção</label>
                <input
                  id="correcao-data"
                  type="date"
                  value={form.correction.date}
                  onChange={(event) => setCorrection({ date: event.target.value })}
                />
              </div>
              <div className="field">
                <label htmlFor="correcao-inicio">Início</label>
                <input
                  id="correcao-inicio"
                  type="time"
                  value={form.correction.time}
                  onChange={(event) => setCorrection({ time: event.target.value })}
                />
              </div>
              <div className="field">
                <label htmlFor="correcao-fim">Término</label>
                <input
                  id="correcao-fim"
                  type="time"
                  value={form.correction.endTime}
                  onChange={(event) => setCorrection({ endTime: event.target.value })}
                />
              </div>
              <div className="field calendar-admin-wide">
                <label htmlFor="correcao-link">Link da correção <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(opcional — Zoom)</span></label>
                <input
                  id="correcao-link"
                  type="url"
                  value={form.correction.link}
                  onChange={(event) => setCorrection({ link: event.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="field calendar-admin-wide">
                <label htmlFor="correcao-descricao">Descrição <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(opcional)</span></label>
                <textarea
                  id="correcao-descricao"
                  rows={2}
                  value={form.correction.description}
                  onChange={(event) => setCorrection({ description: event.target.value })}
                  placeholder="Ex.: Correção ao vivo da prova de linguagens e da redação."
                />
              </div>
            </div>
          </fieldset>
        ) : null}

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
          {events.map((event) => {
            const horario = resumoHorario(event.time, event.endTime ?? '')
            return (
              <div key={event.id} className="list-row">
                <div>
                  <div className="list-title">{event.title}</div>
                  <div className="list-meta">
                    {CALENDAR_EVENT_LABELS[event.type]} · {event.date}
                    {horario && ` · ${horario}`}
                  </div>
                  {event.correction && (
                    <div className="list-meta" style={{ marginTop: 2 }}>
                      Correção · {event.correction.date}
                      {event.correction.time && ` · ${resumoHorario(event.correction.time, event.correction.endTime)}`}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => handleEdit(event)} className="btn btn-ghost btn-sm">Editar</button>
                  <button onClick={() => handleDelete(event.id)} className="btn btn-danger btn-sm">Excluir</button>
                </div>
              </div>
            )
          })}
          {!loading && events.length === 0 && (
            <p className="empty-state">Nenhum evento na agenda ainda.</p>
          )}
        </div>
      </section>
    </main>
  )
}
