import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Upload } from 'lucide-react'
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

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Não foi possível ler o arquivo.'))
    reader.readAsDataURL(file)
  })
}

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

// Campo de upload de um PDF (prova ou gabarito), com o estado "manter / trocar /
// remover" de um arquivo já anexado.
function PdfField(props: {
  label: string
  inputRef: React.RefObject<HTMLInputElement | null>
  file: File | null
  existing: string
  removed: boolean
  onPick: (file: File | null) => void
  onRemove: () => void
  onUndoRemove: () => void
}) {
  const { label, inputRef, file, existing, removed, onPick, onRemove, onUndoRemove } = props
  const temExistente = existing && !removed && !file

  return (
    <div className="field" style={{ margin: 0 }}>
      <label>{label} <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(PDF)</span></label>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
        onChange={(e) => onPick(e.target.files?.[0] ?? null)}
        style={{ display: 'none' }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', boxSizing: 'border-box', padding: '12px 14px', background: 'var(--lilac-tint)', border: '2px dashed #c9befd', borderRadius: 8, color: 'var(--purple)', fontWeight: 700, cursor: 'pointer' }}
      >
        <Upload size={16} /> {file ? file.name : temExistente ? `Trocar (${existing})` : 'Escolher arquivo'}
      </button>
      {removed && existing && (
        <p className="field-hint" style={{ color: '#a16207', fontSize: 12, margin: '6px 0 0' }}>
          "{existing}" será removido ao salvar. <button type="button" onClick={onUndoRemove} style={{ background: 'none', border: 0, color: 'var(--purple)', fontWeight: 700, cursor: 'pointer', padding: 0 }}>Desfazer</button>
        </p>
      )}
      {(file || temExistente) && !removed && (
        <button type="button" onClick={onRemove} style={{ background: 'none', border: 0, color: '#dc2626', fontWeight: 700, fontSize: 12, cursor: 'pointer', padding: '6px 0 0', width: 'fit-content' }}>
          Remover
        </button>
      )}
    </div>
  )
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

  // PDFs de prova e gabarito do simulado. `*File` = arquivo novo escolhido agora;
  // `*Removed` = pediu pra tirar o que já estava; `existing*` = nome do que já
  // está gravado (só no modo edição).
  const [provaFile, setProvaFile] = useState<File | null>(null)
  const [gabaritoFile, setGabaritoFile] = useState<File | null>(null)
  const [provaRemoved, setProvaRemoved] = useState(false)
  const [gabaritoRemoved, setGabaritoRemoved] = useState(false)
  const [existingProva, setExistingProva] = useState('')
  const [existingGabarito, setExistingGabarito] = useState('')
  const provaInputRef = useRef<HTMLInputElement>(null)
  const gabaritoInputRef = useRef<HTMLInputElement>(null)

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
    setProvaFile(null)
    setGabaritoFile(null)
    setProvaRemoved(false)
    setGabaritoRemoved(false)
    setExistingProva('')
    setExistingGabarito('')
    if (provaInputRef.current) provaInputRef.current.value = ''
    if (gabaritoInputRef.current) gabaritoInputRef.current.value = ''
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
      // undefined = manter o PDF atual, null = remover, objeto = trocar.
      const prova = provaFile
        ? { fileName: provaFile.name, fileDataUrl: await readFileAsDataUrl(provaFile) }
        : provaRemoved ? null : undefined
      const gabarito = gabaritoFile
        ? { fileName: gabaritoFile.name, fileDataUrl: await readFileAsDataUrl(gabaritoFile) }
        : gabaritoRemoved ? null : undefined

      if (editingId) {
        await updateCalendarEvent({ data: { id: editingId, ...form, prova, gabarito } })
        showToast('Evento atualizado.')
      } else {
        await createCalendarEvent({ data: { ...form, prova, gabarito } })
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
    setProvaFile(null)
    setGabaritoFile(null)
    setProvaRemoved(false)
    setGabaritoRemoved(false)
    setExistingProva(event.provaFileName ?? '')
    setExistingGabarito(event.gabaritoFileName ?? '')
    if (provaInputRef.current) provaInputRef.current.value = ''
    if (gabaritoInputRef.current) gabaritoInputRef.current.value = ''
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
            <legend>Prova e gabarito (PDF) <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(opcional)</span></legend>
            <p className="field-hint" style={{ color: 'var(--muted)', fontSize: 12, margin: '0 0 12px' }}>
              O aluno baixa a partir do horário do simulado (marca d'água de nome + CPF). Antes disso, só a equipe vê.
            </p>
            <div style={{ display: 'grid', gap: 12 }}>
              <PdfField
                label="Prova"
                inputRef={provaInputRef}
                file={provaFile}
                existing={existingProva}
                removed={provaRemoved}
                onPick={(f) => { setProvaFile(f); setProvaRemoved(false) }}
                onRemove={() => { setProvaFile(null); setProvaRemoved(true); if (provaInputRef.current) provaInputRef.current.value = '' }}
                onUndoRemove={() => setProvaRemoved(false)}
              />
              <PdfField
                label="Gabarito comentado"
                inputRef={gabaritoInputRef}
                file={gabaritoFile}
                existing={existingGabarito}
                removed={gabaritoRemoved}
                onPick={(f) => { setGabaritoFile(f); setGabaritoRemoved(false) }}
                onRemove={() => { setGabaritoFile(null); setGabaritoRemoved(true); if (gabaritoInputRef.current) gabaritoInputRef.current.value = '' }}
                onUndoRemove={() => setGabaritoRemoved(false)}
              />
            </div>
          </fieldset>
        ) : null}

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
                  {(event.provaFileName || event.gabaritoFileName) && (
                    <div className="list-meta" style={{ marginTop: 2 }}>
                      {[event.provaFileName && 'prova (PDF)', event.gabaritoFileName && 'gabarito (PDF)'].filter(Boolean).join(' · ')}
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
