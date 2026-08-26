import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { useEffect, useState, type FormEvent } from 'react'
import { readLocalUser } from '@/lib/identity-context'
import { getServerUser } from '@/lib/auth'
import { userHasRole } from '@/lib/roles'
import {
  createMentoriaGrupoSlot, deleteMentoriaGrupoSlot, listMentoriaGrupoSlots, updateMentoriaGrupoSlot,
  type MentoriaGrupoSlot,
} from '@/lib/mentorias-grupo'

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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível criar o grupo.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    await deleteMentoriaGrupoSlot({ data: { id } })
    await load()
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
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Não foi possível salvar as alterações.')
    } finally {
      setEditSaving(false)
    }
  }

  const sorted = [...slots].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))

  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px', fontFamily: 'sans-serif' }}>
      <Link to="/dashboard" style={{ color: '#6d28d9', fontWeight: 700, textDecoration: 'none' }}>← Voltar ao dashboard</Link>
      <h1 style={{ fontFamily: 'var(--serif, serif)', color: '#0f2342', marginTop: 16 }}>Gerenciar mentorias em grupo</h1>
      <p style={{ color: '#6b7280' }}>Cadastre os grupos com data, horário e número de vagas. Você pode editar o horário e a capacidade a qualquer momento.</p>

      <form onSubmit={handleAdd} style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginTop: 24, flexWrap: 'wrap' }}>
        <div>
          <label style={{ display: 'block', fontSize: 13, marginBottom: 4, color: '#0f2342', fontWeight: 600 }}>Data</label>
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            style={{ padding: 10, border: '1px solid #e0dcf0', borderRadius: 8 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 13, marginBottom: 4, color: '#0f2342', fontWeight: 600 }}>Horário</label>
          <input
            type="time"
            value={time}
            onChange={(event) => setTime(event.target.value)}
            style={{ padding: 10, border: '1px solid #e0dcf0', borderRadius: 8 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 13, marginBottom: 4, color: '#0f2342', fontWeight: 600 }}>Vagas no grupo</label>
          <input
            type="number"
            min={1}
            value={capacity}
            onChange={(event) => setCapacity(event.target.value)}
            style={{ padding: 10, border: '1px solid #e0dcf0', borderRadius: 8, width: 90 }}
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          style={{ background: '#6d28d9', color: '#fff', border: 'none', borderRadius: 8, padding: '11px 20px', fontWeight: 700, cursor: 'pointer' }}
        >
          {saving ? 'Adicionando...' : 'Adicionar grupo'}
        </button>
      </form>
      {error && <p style={{ color: '#dc2626', marginTop: 8 }}>{error}</p>}

      <section style={{ marginTop: 32 }}>
        <h2 style={{ fontSize: 18, color: '#0f2342' }}>Grupos cadastrados</h2>
        {loading && <p>Carregando...</p>}
        <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
          {sorted.map((slot) => {
            const isEditing = editingId === slot.id
            return (
              <div
                key={slot.id}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, background: '#fff', border: '1px solid #e0dcf0', borderRadius: 10, padding: 14 }}
              >
                {isEditing ? (
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap', flex: 1 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: '#0f2342', fontWeight: 600 }}>Horário</label>
                      <input
                        type="time"
                        value={editTime}
                        onChange={(event) => setEditTime(event.target.value)}
                        style={{ padding: 8, border: '1px solid #e0dcf0', borderRadius: 8 }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: '#0f2342', fontWeight: 600 }}>Vagas</label>
                      <input
                        type="number"
                        min={slot.students.length || 1}
                        value={editCapacity}
                        onChange={(event) => setEditCapacity(event.target.value)}
                        style={{ padding: 8, border: '1px solid #e0dcf0', borderRadius: 8, width: 80 }}
                      />
                    </div>
                    <button
                      onClick={() => handleSaveEdit(slot.id)}
                      disabled={editSaving}
                      style={{ background: '#6d28d9', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      {editSaving ? 'Salvando...' : 'Salvar'}
                    </button>
                    <button
                      onClick={cancelEdit}
                      disabled={editSaving}
                      style={{ color: '#6b7280', background: 'none', border: '1px solid #e0dcf0', borderRadius: 8, padding: '8px 14px', cursor: 'pointer' }}
                    >
                      Cancelar
                    </button>
                    {editError && <p style={{ color: '#dc2626', width: '100%', margin: 0 }}>{editError}</p>}
                  </div>
                ) : (
                  <div>
                    <b>{slot.date}</b> às <b>{slot.time}</b> · {slot.duration} min · {slot.students.length}/{slot.capacity} vagas
                    {slot.students.length > 0 && (
                      <div style={{ color: '#6d28d9', fontSize: 13, marginTop: 4 }}>
                        {slot.students.map((student) => student.name).join(', ')}
                      </div>
                    )}
                    {slot.students.length === 0 && <div style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>Nenhum aluno inscrito</div>}
                  </div>
                )}

                {!isEditing && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => startEdit(slot)}
                      style={{ color: '#6d28d9', background: 'none', border: '1px solid #e0dcf0', borderRadius: 8, padding: '8px 14px', cursor: 'pointer' }}
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(slot.id)}
                      style={{ color: '#dc2626', background: 'none', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 14px', cursor: 'pointer' }}
                    >
                      Excluir
                    </button>
                  </div>
                )}
              </div>
            )
          })}
          {!loading && sorted.length === 0 && <p style={{ color: '#6b7280' }}>Nenhum grupo cadastrado ainda.</p>}
        </div>
      </section>
    </main>
  )
}
