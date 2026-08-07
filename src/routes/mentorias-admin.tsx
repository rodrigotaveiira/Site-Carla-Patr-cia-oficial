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
      await createMentoriaSlot({ data: { date, time, duration: 45 } })
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
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px', fontFamily: 'sans-serif' }}>
      <Link to="/dashboard" style={{ color: '#6d28d9', fontWeight: 700, textDecoration: 'none' }}>← Voltar ao dashboard</Link>
      <h1 style={{ fontFamily: 'var(--serif, serif)', color: '#0f2342', marginTop: 16 }}>Gerenciar horários de mentoria</h1>
      <p style={{ color: '#6b7280' }}>Cadastre os horários em que você está disponível. Assim que um aluno marcar, o horário some da lista automaticamente pros outros.</p>

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
        <button
          type="submit"
          disabled={saving}
          style={{ background: '#6d28d9', color: '#fff', border: 'none', borderRadius: 8, padding: '11px 20px', fontWeight: 700, cursor: 'pointer' }}
        >
          {saving ? 'Adicionando...' : 'Adicionar horário'}
        </button>
      </form>
      {error && <p style={{ color: '#dc2626', marginTop: 8 }}>{error}</p>}

      <section style={{ marginTop: 32 }}>
        <h2 style={{ fontSize: 18, color: '#0f2342' }}>Horários cadastrados</h2>
        {loading && <p>Carregando...</p>}
        <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
          {sorted.map((slot) => (
            <div
              key={slot.id}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', border: '1px solid #e0dcf0', borderRadius: 10, padding: 14 }}
            >
              <div>
                <b>{slot.date}</b> às <b>{slot.time}</b> · {slot.duration} min
                {slot.status === 'booked' && slot.student && (
                  <div style={{ color: '#6d28d9', fontSize: 13, marginTop: 4 }}>
                    Reservado por {slot.student.name} ({slot.student.email})
                  </div>
                )}
                {slot.status === 'available' && <div style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>Disponível</div>}
              </div>
              <button
                onClick={() => handleDelete(slot.id)}
                style={{ color: '#dc2626', background: 'none', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 14px', cursor: 'pointer' }}
              >
                Excluir
              </button>
            </div>
          ))}
          {!loading && sorted.length === 0 && <p style={{ color: '#6b7280' }}>Nenhum horário cadastrado ainda.</p>}
        </div>
      </section>
    </main>
  )
}
