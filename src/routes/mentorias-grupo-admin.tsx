import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { useEffect, useState, type FormEvent } from 'react'
import { readLocalUser } from '@/lib/identity-context'
import { getServerUser } from '@/lib/auth'
import { userHasRole } from '@/lib/roles'
import {
  createMentoriaGrupoSlot, deleteMentoriaGrupoSlot, listMentoriaGrupoSlots, updateMentoriaGrupoSlot,
  type MentoriaGrupoSlot,
} from '@/lib/mentorias-grupo'
import { useToast } from '@/lib/toast'

export const Route = createFileRoute('/mentorias-grupo-admin')({
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
  component: MentoriasGrupoAdminPage,
})

function MentoriasGrupoAdminPage() {
  const showToast = useToast()
  const [slots, setSlots] = useState<MentoriaGrupoSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [capacity, setCapacity] = useState('6')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTime, setEditTime] = useState('')
  const [editCapacity, setEditCapacity] = useState('')
  const [editError, setEditError] = useState('')
  const [editSaving, setEditSaving] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const data = await listMentoriaGrupoSlots()
      setSlots(data)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Não foi possível carregar os grupos.', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function handleAdd(event: FormEvent) {
    event.preventDefault()
    setError('')
    const capacityNumber = Number(capacity)
    if (!date || !time) {
      setError('Preencha a data e o horário.')
      return
    }
    if (!capacityNumber || capacityNumber < 1) {
      setError('Informe quantas pessoas o grupo terá.')
      return
    }
    setSaving(true)
    try {
      await createMentoriaGrupoSlot({ data: { date, time, duration: 40, capacity: capacityNumber } })
      setDate('')
      setTime('')
      setCapacity('6')
      await load()
      showToast('Grupo adicionado.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível criar o grupo.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteMentoriaGrupoSlot({ data: { id } })
      await load()
      showToast('Grupo excluído.')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Não foi possível excluir o grupo.', 'error')
    }
  }

  function startEdit(slot: MentoriaGrupoSlot) {
    setEditingId(slot.id)
    setEditTime(slot.time)
    setEditCapacity(String(slot.capacity))
    setEditError('')
  }

  function cancelEdit() {
    setEditingId(null)
    setEditError('')
  }

  async function handleSaveEdit(id: string) {
    setEditError('')
    const capacityNumber = Number(editCapacity)
    if (!editTime) {
      setEditError('Preencha o horário.')
      return
    }
    if (!capacityNumber || capacityNumber < 1) {
      setEditError('Informe quantas pessoas o grupo terá.')
      return
    }
    setEditSaving(true)
    try {
      await updateMentoriaGrupoSlot({ data: { id, time: editTime, duration: 40, capacity: capacityNumber } })
      setEditingId(null)
      await load()
      showToast('Alterações salvas.')
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Não foi possível salvar as alterações.')
    } finally {
      setEditSaving(false)
    }
  }

  const sorted = [...slots].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))

  return (
    <main className="panel">
      <Link to="/dashboard" className="panel-back">← Voltar ao dashboard</Link>
      <h1>Gerenciar mentorias em grupo</h1>
      <p className="panel-subtitle">Cadastre os grupos com data, horário e número de vagas. Você pode editar o horário e a capacidade a qualquer momento.</p>

      <form onSubmit={handleAdd} style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginTop: 24, flexWrap: 'wrap' }}>
        <div className="field">
          <label>Data</label>
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} style={{ width: 'auto' }} />
        </div>
        <div className="field">
          <label>Horário</label>
          <input type="time" value={time} onChange={(event) => setTime(event.target.value)} style={{ width: 'auto' }} />
        </div>
        <div className="field">
          <label>Vagas no grupo</label>
          <input type="number" min={1} value={capacity} onChange={(event) => setCapacity(event.target.value)} style={{ width: 90 }} />
        </div>
        <button type="submit" disabled={saving} className="btn btn-primary">
          {saving ? 'Adicionando...' : 'Adicionar grupo'}
        </button>
      </form>
      {error && <p className="form-error">{error}</p>}

      <section>
        <h2 className="panel-section-title">Grupos cadastrados</h2>
        {loading && <p className="panel-subtitle">Carregando...</p>}
        <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
          {sorted.map((slot) => {
            const isEditing = editingId === slot.id
            return (
              <div key={slot.id} className="list-row" style={{ alignItems: 'flex-start' }}>
                {isEditing ? (
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap', flex: 1 }}>
                    <div className="field">
                      <label>Horário</label>
                      <input type="time" value={editTime} onChange={(event) => setEditTime(event.target.value)} style={{ width: 'auto' }} />
                    </div>
                    <div className="field">
                      <label>Vagas</label>
                      <input
                        type="number"
                        min={slot.students.length || 1}
                        value={editCapacity}
                        onChange={(event) => setEditCapacity(event.target.value)}
                        style={{ width: 80 }}
                      />
                    </div>
                    <button onClick={() => handleSaveEdit(slot.id)} disabled={editSaving} className="btn btn-primary btn-sm">
                      {editSaving ? 'Salvando...' : 'Salvar'}
                    </button>
                    <button onClick={cancelEdit} disabled={editSaving} className="btn btn-ghost btn-sm">
                      Cancelar
                    </button>
                    {editError && <p className="form-error" style={{ width: '100%' }}>{editError}</p>}
                  </div>
                ) : (
                  <div>
                    <b style={{ color: 'var(--navy)' }}>{slot.date}</b> às <b style={{ color: 'var(--navy)' }}>{slot.time}</b> · {slot.duration} min · {slot.students.length}/{slot.capacity} vagas
                    {slot.students.length > 0 && (
                      <div style={{ color: 'var(--purple)', fontSize: 13, marginTop: 4 }}>
                        {slot.students.map((student) => student.name).join(', ')}
                      </div>
                    )}
                    {slot.students.length === 0 && <div className="list-meta">Nenhum aluno inscrito</div>}
                  </div>
                )}

                {!isEditing && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => startEdit(slot)} className="btn btn-ghost btn-sm">Editar</button>
                    <button onClick={() => handleDelete(slot.id)} className="btn btn-danger btn-sm">Excluir</button>
                  </div>
                )}
              </div>
            )
          })}
          {!loading && sorted.length === 0 && <p className="empty-state">Nenhum grupo cadastrado ainda.</p>}
        </div>
      </section>
    </main>
  )
}
