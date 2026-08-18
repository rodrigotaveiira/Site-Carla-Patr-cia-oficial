import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { CalendarDays, Clock3 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { readLocalUser, useIdentity } from '@/lib/identity-context'
import { getServerUser } from '@/lib/auth'
import { userHasRole, isStaff } from '@/lib/roles'
import { bookMentoriaSlot, cancelMentoriaSlot, listMentoriaSlots, type MentoriaSlot } from '@/lib/mentorias'

export const Route = createFileRoute('/mentorias')({
  beforeLoad: async () => {
    if (typeof window !== 'undefined') {
      const localUser = readLocalUser()
      if (localUser) return { user: localUser }
    }

    const user = await getServerUser()
    if (!user) throw redirect({ to: '/login' })
    if (!userHasRole(user, 'aprovado') && !isStaff(user)) throw redirect({ to: '/aguardando-aprovacao' })
    return { user }
  },
  component: MentoriasPage,
})

function formatDate(date: string) {
  const [year, month, day] = date.split('-').map(Number)
  const parsed = new Date(year, month - 1, day)
  return parsed.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
}

function MentoriasPage() {
  const { user } = useIdentity()
  const [slots, setSlots] = useState<MentoriaSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [actionError, setActionError] = useState('')
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)

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

  const today = new Date().toISOString().slice(0, 10)
  const futureSlots = slots.filter((slot) => slot.date >= today)
  const mySlots = futureSlots.filter((slot) => slot.status === 'booked' && slot.student?.email === user?.email)
  const availableSlots = futureSlots.filter((slot) => slot.status === 'available')

  const grouped = availableSlots.reduce<Record<string, MentoriaSlot[]>>((acc, slot) => {
    acc[slot.date] = acc[slot.date] || []
    acc[slot.date].push(slot)
    return acc
  }, {})

  async function handleBook(id: string) {
    setActionError('')
    setActionLoadingId(id)
    try {
      await bookMentoriaSlot({ data: { id } })
      await load()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Não foi possível marcar esse horário.')
    } finally {
      setActionLoadingId(null)
    }
  }

  async function handleCancel(id: string) {
    setActionError('')
    setActionLoadingId(id)
    try {
      await cancelMentoriaSlot({ data: { id } })
      await load()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Não foi possível cancelar esse horário.')
    } finally {
      setActionLoadingId(null)
    }
  }

  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px', fontFamily: 'sans-serif' }}>
      <Link to="/dashboard" style={{ color: '#6d28d9', fontWeight: 700, textDecoration: 'none' }}>← Voltar ao dashboard</Link>
      <h1 style={{ fontFamily: 'var(--serif, serif)', color: '#0f2342', marginTop: 16, marginBottom: 4 }}>Mentorias individuais</h1>
      <p style={{ color: '#6b7280' }}>Escolha um horário disponível para conversar com a Carla. Cada encontro dura 45 minutos.</p>

      {actionError && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 8, padding: 12, margin: '16px 0' }}>
          {actionError}
        </div>
      )}

      {mySlots.length > 0 && (
        <section style={{ marginTop: 32 }}>
          <h2 style={{ fontSize: 18, color: '#0f2342' }}>Seus horários marcados</h2>
          <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
            {mySlots.map((slot) => (
              <div
                key={slot.id}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, background: '#f4f2fb', border: '1px solid #e0dcf0', borderRadius: 10, padding: 16 }}
              >
                <div>
                  <div style={{ fontWeight: 700, textTransform: 'capitalize' }}>{formatDate(slot.date)}</div>
                  <div style={{ color: '#6b7280', display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}>
                    <Clock3 size={14} /> {slot.time} · {slot.duration} min
                  </div>
                </div>
                <button
                  onClick={() => handleCancel(slot.id)}
                  disabled={actionLoadingId === slot.id}
                  style={{ color: '#dc2626', fontWeight: 700, background: 'none', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 14px', cursor: 'pointer' }}
                >
                  {actionLoadingId === slot.id ? 'Cancelando...' : 'Cancelar'}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section style={{ marginTop: 32 }}>
        <h2 style={{ fontSize: 18, color: '#0f2342' }}>Horários disponíveis</h2>
        {loading && <p style={{ color: '#6b7280' }}>Carregando...</p>}
        {!loading && Object.keys(grouped).length === 0 && (
          <p style={{ color: '#6b7280' }}>Nenhum horário disponível no momento. Volte em breve!</p>
        )}
        <div style={{ display: 'grid', gap: 20, marginTop: 12 }}>
          {Object.entries(grouped).map(([date, dateSlots]) => (
            <div key={date}>
              <div style={{ fontWeight: 700, textTransform: 'capitalize', color: '#0f2342', marginBottom: 8, display: 'flex', gap: 6, alignItems: 'center' }}>
                <CalendarDays size={16} /> {formatDate(date)}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {dateSlots.map((slot) => (
                  <button
                    key={slot.id}
                    onClick={() => handleBook(slot.id)}
                    disabled={actionLoadingId === slot.id}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', border: '1px solid #e0dcf0', borderRadius: 8, padding: '10px 16px', fontWeight: 700, color: '#6d28d9', cursor: 'pointer' }}
                  >
                    <Clock3 size={14} /> {slot.time} {actionLoadingId === slot.id ? '...' : ''}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
