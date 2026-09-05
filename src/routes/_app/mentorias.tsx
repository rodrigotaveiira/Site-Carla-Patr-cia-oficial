import { createFileRoute, redirect } from '@tanstack/react-router'
import { CalendarDays, Clock3 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { readLocalUser, useIdentity } from '@/lib/identity-context'
import { getServerUser } from '@/lib/auth'
import { userHasRole, isStaff } from '@/lib/roles'
import { bookMentoriaSlot, cancelMentoriaSlot, listMentoriaSlots, type MentoriaSlot } from '@/lib/mentorias'
import { confirmSchedulingAuth } from '@/lib/reauth'
import { EmptyState } from '@/components/EmptyState'
import { ConfirmPasswordModal } from '@/components/ConfirmPasswordModal'
import { formatarHora } from '@/lib/formato'

export const Route = createFileRoute('/_app/mentorias')({
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
  // Horário escolhido, esperando o aluno confirmar com a senha.
  const [pendingSlot, setPendingSlot] = useState<MentoriaSlot | null>(null)

  async function load() {
    setLoading(true)
    try {
      const data = await listMentoriaSlots()
      setSlots(data)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Não foi possível carregar os horários.')
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
  const hasBooking = mySlots.length > 0

  const grouped = availableSlots.reduce<Record<string, MentoriaSlot[]>>((acc, slot) => {
    acc[slot.date] = acc[slot.date] || []
    acc[slot.date].push(slot)
    return acc
  }, {})

  // Só marca depois que a senha da conta confere. Os erros sobem pro modal, que
  // é onde o aluno está olhando — inclusive o de horário tomado por outro aluno
  // entre a escolha e a confirmação.
  async function handleConfirmBooking(password: string) {
    const slot = pendingSlot
    if (!slot) return

    setActionError('')

    // Confirma a senha NO SERVIDOR (verifica no Netlify Identity e grava um
    // marcador de auth recente). O agendamento abaixo exige esse marcador —
    // não dá mais pra marcar chamando a server function direto.
    await confirmSchedulingAuth({ data: { password } })

    await bookMentoriaSlot({ data: { id: slot.id } })
    setPendingSlot(null)
    await load()
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
    <div className="panel">
      <h1 style={{ marginBottom: 4 }}>Mentoria individual</h1>
      <p className="panel-subtitle">Escolha um horário disponível para conversar com Carlinha. Lembre-se de que cada encontro dura 40 minutos.</p>

      {actionError && (
        <div className="form-error" style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 12, margin: '16px 0' }}>
          {actionError}
        </div>
      )}

      {mySlots.length > 0 && (
        <section>
          <h2 className="panel-section-title">Seus horários marcados</h2>
          <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
            {mySlots.map((slot) => (
              <div key={slot.id} className="list-row" style={{ background: 'var(--lilac-tint)', borderColor: '#e0dcf0' }}>
                <div>
                  <div className="list-title" style={{ textTransform: 'capitalize' }}>{formatDate(slot.date)}</div>
                  <div className="list-meta" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <Clock3 size={14} /> {formatarHora(slot.time)} · {slot.duration} min
                  </div>
                </div>
                <button onClick={() => handleCancel(slot.id)} disabled={actionLoadingId === slot.id} className="btn btn-danger btn-sm">
                  {actionLoadingId === slot.id ? 'Cancelando...' : 'Cancelar'}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="panel-section-title">Horários disponíveis</h2>
        {hasBooking && (
          <p className="panel-section-hint">Você já tem um encontro marcado. Cancele-o acima pra poder escolher outro horário.</p>
        )}
        {loading && <p className="panel-subtitle">Carregando...</p>}
        {!loading && Object.keys(grouped).length === 0 && (
          <EmptyState icon={CalendarDays} title="Nenhum horário disponível no momento" description="A professora ainda não abriu novos horários de mentoria. Volte em breve!" />
        )}
        <div style={{ display: 'grid', gap: 20, marginTop: 12 }}>
          {Object.entries(grouped).map(([date, dateSlots]) => (
            <div key={date}>
              <div style={{ fontWeight: 700, textTransform: 'capitalize', color: 'var(--navy)', marginBottom: 8, display: 'flex', gap: 6, alignItems: 'center' }}>
                <CalendarDays size={16} /> {formatDate(date)}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {dateSlots.map((slot) => (
                  <button
                    key={slot.id}
                    onClick={() => setPendingSlot(slot)}
                    disabled={hasBooking}
                    title={hasBooking ? 'Cancele seu encontro marcado pra escolher outro horário.' : undefined}
                    className="btn btn-ghost"
                  >
                    <Clock3 size={14} /> {formatarHora(slot.time)}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {pendingSlot && (
        <ConfirmPasswordModal
          detail={`${formatDate(pendingSlot.date)} às ${formatarHora(pendingSlot.time)} · ${pendingSlot.duration} min`}
          confirmLabel="Confirmar horário"
          onConfirm={handleConfirmBooking}
          onCancel={() => setPendingSlot(null)}
        />
      )}
    </div>
  )
}
