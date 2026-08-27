import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { useEffect, useState, type FormEvent } from 'react'
import { readLocalUser } from '@/lib/identity-context'
import { getServerUser } from '@/lib/auth'
import { userHasRole } from '@/lib/roles'
import { createMentoriaSlot, deleteMentoriaSlot, listMentoriaSlots, type MentoriaSlot } from '@/lib/mentorias'

export const Route = createFileRoute('/mentorias-admin')({
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
  component: MentoriasAdminPage,
})

function MentoriasAdminPage() {
  const [slots, setSlots] = useState<MentoriaSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const data = await listMentoriaSlots()
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
    if (!date || !time) {
      setError('Preencha a data e o horário.')
      return
    }
    setSaving(true)
    try {
      await createMentoriaSlot({ data: { date, time, duration: 40 } })
      setDate('')
      setTime('')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível criar o horário.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    await deleteMentoriaSlot({ data: { id } })
    await load()
  }

  const sorted = [...slots].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))

  return (
    <main className="panel">
      <Link to="/dashboard" className="panel-back">← Voltar ao dashboard</Link>
      <h1>Gerenciar horários de mentoria</h1>
      <p className="panel-subtitle">Cadastre os horários em que você está disponível. Assim que um aluno marcar, o horário some da lista automaticamente pros outros.</p>

      <form onSubmit={handleAdd} style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginTop: 24, flexWrap: 'wrap' }}>
        <div className="field">
          <label>Data</label>
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} style={{ width: 'auto' }} />
        </div>
        <div className="field">
          <label>Horário</label>
          <input type="time" value={time} onChange={(event) => setTime(event.target.value)} style={{ width: 'auto' }} />
        </div>
        <button type="submit" disabled={saving} className="btn btn-primary">
          {saving ? 'Adicionando...' : 'Adicionar horário'}
        </button>
      </form>
      {error && <p className="form-error">{error}</p>}

      <section>
        <h2 className="panel-section-title">Horários cadastrados</h2>
        {loading && <p className="panel-subtitle">Carregando...</p>}
        <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
          {sorted.map((slot) => (
            <div key={slot.id} className="list-row">
              <div>
                <b style={{ color: 'var(--navy)' }}>{slot.date}</b> às <b style={{ color: 'var(--navy)' }}>{slot.time}</b> · {slot.duration} min
                {slot.status === 'booked' && slot.student && (
                  <div style={{ color: 'var(--purple)', fontSize: 13, marginTop: 4 }}>
                    Reservado por {slot.student.name} ({slot.student.email})
                  </div>
                )}
                {slot.status === 'available' && <div className="list-meta">Disponível</div>}
              </div>
              <button onClick={() => handleDelete(slot.id)} className="btn btn-danger btn-sm">
                Excluir
              </button>
            </div>
          ))}
          {!loading && sorted.length === 0 && <p className="empty-state">Nenhum horário cadastrado ainda.</p>}
        </div>
      </section>
    </main>
  )
}
