import { createFileRoute, redirect } from '@tanstack/react-router'
import { CalendarDays, Clock3, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { readLocalUser, useIdentity } from '@/lib/identity-context'
import { getServerUser } from '@/lib/auth'
import { userHasRole, isStaff } from '@/lib/roles'
import { joinMentoriaGrupoSlot, leaveMentoriaGrupoSlot, listMentoriaGrupoSlots, type MentoriaGrupoSlot } from '@/lib/mentorias-grupo'
import { EmptyState } from '@/components/EmptyState'

export const Route = createFileRoute('/_app/mentorias-grupo')({
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
  component: MentoriasGrupoPage,
})

function formatDate(date: string) {
  const [year, month, day] = date.split('-').map(Number)
  const parsed = new Date(year, month - 1, day)
  return parsed.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
}

function MentoriasGrupoPage() {
  const { user } = useIdentity()
  const [slots, setSlots] = useState<MentoriaGrupoSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [actionError, setActionError] = useState('')
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)

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

  const today = new Date().toISOString().slice(0, 10)
  const futureSlots = slots.filter((slot) => slot.date >= today)
  const mySlots = futureSlots.filter((slot) => slot.students.some((student) => student.email === user?.email))
  const openSlots = futureSlots.filter(
    (slot) => slot.students.length < slot.capacity && !slot.students.some((student) => student.email === user?.email),
  )

  const grouped = openSlots.reduce<Record<string, MentoriaGrupoSlot[]>>((acc, slot) => {
    acc[slot.date] = acc[slot.date] || []
    acc[slot.date].push(slot)
    return acc
  }, {})

  async function handleJoin(id: string) {
    setActionError('')
    setActionLoadingId(id)
    try {
      await joinMentoriaGrupoSlot({ data: { id } })
      await load()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Não foi possível entrar nesse grupo.')
    } finally {
      setActionLoadingId(null)
    }
  }

  async function handleLeave(id: string) {
    setActionError('')
    setActionLoadingId(id)
    try {
      await leaveMentoriaGrupoSlot({ data: { id } })
      await load()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Não foi possível sair desse grupo.')
    } finally {
      setActionLoadingId(null)
    }
  }

  return (
    <div className="panel">
      <h1 style={{ marginBottom: 4 }}>Mentorias em grupo</h1>
      <p className="panel-subtitle">Entre em um grupo com horário e número de vagas definidos pela professora.</p>

      {actionError && (
        <div className="form-error" style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 12, margin: '16px 0' }}>
          {actionError}
        </div>
      )}

      {mySlots.length > 0 && (
        <section>
          <h2 className="panel-section-title">Seus grupos</h2>
          <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
            {mySlots.map((slot) => (
              <div key={slot.id} className="list-row" style={{ background: 'var(--lilac-tint)', borderColor: '#e0dcf0' }}>
                <div>
                  <div className="list-title" style={{ textTransform: 'capitalize' }}>{formatDate(slot.date)}</div>
                  <div className="list-meta" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <Clock3 size={14} /> {slot.time} · {slot.duration} min
                    <span style={{ marginLeft: 8, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Users size={14} /> {slot.students.length}/{slot.capacity}
                    </span>
                  </div>
                </div>
                <button onClick={() => handleLeave(slot.id)} disabled={actionLoadingId === slot.id} className="btn btn-danger btn-sm">
                  {actionLoadingId === slot.id ? 'Saindo...' : 'Sair do grupo'}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="panel-section-title">Grupos com vaga</h2>
        {loading && <p className="panel-subtitle">Carregando...</p>}
        {!loading && Object.keys(grouped).length === 0 && (
          <EmptyState icon={Users} title="Nenhum grupo com vaga disponível" description="A professora ainda não abriu novos grupos de mentoria. Volte em breve!" />
        )}
        <div style={{ display: 'grid', gap: 20, marginTop: 12 }}>
          {Object.entries(grouped).map(([date, dateSlots]) => (
            <div key={date}>
              <div style={{ fontWeight: 700, textTransform: 'capitalize', color: 'var(--navy)', marginBottom: 8, display: 'flex', gap: 6, alignItems: 'center' }}>
                <CalendarDays size={16} /> {formatDate(date)}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {dateSlots.map((slot) => (
                  <button key={slot.id} onClick={() => handleJoin(slot.id)} disabled={actionLoadingId === slot.id} className="btn btn-ghost">
                    <Clock3 size={14} /> {slot.time}
                    <span style={{ color: '#8e98a5', fontWeight: 600 }}>
                      ({slot.students.length}/{slot.capacity})
                    </span>
                    {actionLoadingId === slot.id ? '...' : ''}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
