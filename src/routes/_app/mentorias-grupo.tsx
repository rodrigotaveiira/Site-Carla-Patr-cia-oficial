import { createFileRoute, redirect } from '@tanstack/react-router'
import { CalendarDays, Clock3, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { readLocalUser, useIdentity } from '@/lib/identity-context'
import { getServerUser } from '@/lib/auth'
import { userHasRole, isStaff } from '@/lib/roles'
import {
  joinMentoriaGrupoSlot, leaveMentoriaGrupoSlot, listMentoriaGrupoSlots,
  MENTORIA_GRUPO_TITULO_PADRAO, terminoDoGrupo, MAX_GRUPOS_SIMULTANEOS, type MentoriaGrupoSlot,
} from '@/lib/mentorias-grupo'
import { confirmSchedulingAuth } from '@/lib/reauth'
import { EmptyState } from '@/components/EmptyState'
import { ConfirmPasswordModal } from '@/components/ConfirmPasswordModal'
import { formatarHora } from '@/lib/formato'
import { VoltarAoPainel } from '@/components/VoltarAoPainel'

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
  // Grupo escolhido, esperando o aluno confirmar com a senha.
  const [pendingSlot, setPendingSlot] = useState<MentoriaGrupoSlot | null>(null)

  async function load() {
    setLoading(true)
    try {
      const data = await listMentoriaGrupoSlots()
      setSlots(data)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Não foi possível carregar os grupos.')
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
  // Até MAX_GRUPOS_SIMULTANEOS grupos ao mesmo tempo — sem distinção de tipo
  // (ver joinMentoriaGrupoSlot).
  const grupoCheio = mySlots.length >= MAX_GRUPOS_SIMULTANEOS
  const openSlots = futureSlots.filter(
    (slot) => slot.students.length < slot.capacity && !slot.students.some((student) => student.email === user?.email),
  )

  const grouped = openSlots.reduce<Record<string, MentoriaGrupoSlot[]>>((acc, slot) => {
    acc[slot.date] = acc[slot.date] || []
    acc[slot.date].push(slot)
    return acc
  }, {})

  // Só entra no grupo depois que a senha da conta confere. Os erros sobem pro
  // modal, que é onde o aluno está olhando — inclusive o de grupo que lotou
  // entre a escolha e a confirmação.
  async function handleConfirmJoin(password: string) {
    const slot = pendingSlot
    if (!slot) return

    setActionError('')

    // Confirma a senha NO SERVIDOR (verifica no Netlify Identity e grava um
    // marcador de auth recente). Entrar no grupo abaixo exige esse marcador.
    await confirmSchedulingAuth({ data: { password } })

    await joinMentoriaGrupoSlot({ data: { id: slot.id } })
    setPendingSlot(null)
    await load()
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
      <VoltarAoPainel destino="/dashboard" />
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
                <div style={{ minWidth: 0 }}>
                  <div className="list-title">{slot.title || MENTORIA_GRUPO_TITULO_PADRAO}</div>
                  <div className="list-meta" style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ textTransform: 'capitalize' }}>{formatDate(slot.date)}</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Clock3 size={14} /> {formatarHora(slot.time)} às {formatarHora(terminoDoGrupo(slot))}
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Users size={14} /> {slot.students.length}/{slot.capacity}
                    </span>
                  </div>
                  {slot.description && (
                    <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>{slot.description}</div>
                  )}
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
        {mySlots.length === 1 && (
          <p className="panel-section-hint">
            Você já está inscrito em um grupo. Ainda pode entrar em mais {MAX_GRUPOS_SIMULTANEOS - mySlots.length}.
          </p>
        )}
        {grupoCheio && (
          <p className="panel-section-hint">
            Você já tem {MAX_GRUPOS_SIMULTANEOS} grupos marcados — o máximo permitido ao mesmo tempo. Saia de um deles acima pra poder entrar em outro.
          </p>
        )}
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
              {/* Cada grupo agora é uma linha, e não um botão só com a hora: o
                  aluno precisa saber do que a mentoria trata antes de ocupar uma
                  vaga, e título e descrição não cabiam numa etiqueta de horário. */}
              <div style={{ display: 'grid', gap: 10 }}>
                {dateSlots.map((slot) => (
                  <div key={slot.id} className="list-row">
                    <div style={{ minWidth: 0 }}>
                      <div className="list-title">{slot.title || MENTORIA_GRUPO_TITULO_PADRAO}</div>
                      <div className="list-meta" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Clock3 size={14} /> {formatarHora(slot.time)} às {formatarHora(terminoDoGrupo(slot))}
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Users size={14} /> {slot.students.length}/{slot.capacity} vagas
                        </span>
                      </div>
                      {slot.description && (
                        <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>{slot.description}</div>
                      )}
                    </div>
                    <button
                      onClick={() => setPendingSlot(slot)}
                      disabled={grupoCheio}
                      title={grupoCheio ? `Você já tem ${MAX_GRUPOS_SIMULTANEOS} grupos marcados. Saia de um pra poder entrar em outro.` : undefined}
                      className="btn btn-primary btn-sm"
                    >
                      Entrar no grupo
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {pendingSlot && (
        <ConfirmPasswordModal
          detail={`${pendingSlot.title || MENTORIA_GRUPO_TITULO_PADRAO} — ${formatDate(pendingSlot.date)}, ${formatarHora(pendingSlot.time)} às ${formatarHora(terminoDoGrupo(pendingSlot))} · ${pendingSlot.students.length}/${pendingSlot.capacity} vagas ocupadas`}
          confirmLabel="Confirmar entrada no grupo"
          onConfirm={handleConfirmJoin}
          onCancel={() => setPendingSlot(null)}
        />
      )}
    </div>
  )
}
