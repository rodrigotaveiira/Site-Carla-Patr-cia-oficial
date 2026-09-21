import { createFileRoute, redirect } from '@tanstack/react-router'
import { X } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { readLocalUser } from '@/lib/identity-context'
import { getServerUser } from '@/lib/auth'
import { userHasRole } from '@/lib/roles'
import {
  createMentoriaGrupoSlot, deleteMentoriaGrupoSlot, listMentoriaGrupoSlots, removeMentoriaGrupoStudent, updateMentoriaGrupoSlot,
  MENTORIA_GRUPO_TITULO_PADRAO, terminoDoGrupo,
  type MentoriaGrupoSlot,
} from '@/lib/mentorias-grupo'
import { formatarHora } from '@/lib/formato'
import { useToast } from '@/lib/toast'
import { VoltarAoPainel } from '@/components/VoltarAoPainel'

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
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [capacity, setCapacity] = useState('6')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editTime, setEditTime] = useState('')
  const [editEndTime, setEditEndTime] = useState('')
  const [editCapacity, setEditCapacity] = useState('')
  const [editError, setEditError] = useState('')
  const [editSaving, setEditSaving] = useState(false)

  // Chave "<idDoGrupo>__<email>" de quem está sendo removido agora — só essa
  // linha desabilita, o resto do grupo continua clicável.
  const [removingStudent, setRemovingStudent] = useState<string | null>(null)

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
    if (!title.trim()) {
      setError('Dê um título para a mentoria.')
      return
    }
    if (!description.trim()) {
      setError('Escreva do que a mentoria trata.')
      return
    }
    if (!date || !time || !endTime) {
      setError('Preencha a data, o horário de início e o de término.')
      return
    }
    if (endTime <= time) {
      setError('O término precisa ser depois do início.')
      return
    }
    if (!capacityNumber || capacityNumber < 1) {
      setError('Informe quantas pessoas o grupo terá.')
      return
    }
    setSaving(true)
    try {
      await createMentoriaGrupoSlot({ data: { date, time, endTime, title, description, capacity: capacityNumber } })
      setTitle('')
      setDescription('')
      setDate('')
      setTime('')
      setEndTime('')
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

  async function handleRemoveStudent(groupId: string, email: string, name: string) {
    if (!confirm(`Remover "${name}" deste grupo?`)) return
    const chave = `${groupId}__${email}`
    setRemovingStudent(chave)
    try {
      await removeMentoriaGrupoStudent({ data: { id: groupId, email } })
      await load()
      showToast('Aluno removido do grupo.')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Não foi possível remover o aluno.', 'error')
    } finally {
      setRemovingStudent(null)
    }
  }

  function startEdit(slot: MentoriaGrupoSlot) {
    setEditingId(slot.id)
    setEditTitle(slot.title || '')
    setEditDescription(slot.description || '')
    setEditTime(slot.time)
    // Grupo antigo não tem término gravado: entra o derivado da duração, que é
    // o horário que ele já tinha na prática.
    setEditEndTime(terminoDoGrupo(slot))
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
    if (!editTitle.trim()) {
      setEditError('Dê um título para a mentoria.')
      return
    }
    if (!editDescription.trim()) {
      setEditError('Escreva do que a mentoria trata.')
      return
    }
    if (!editTime || !editEndTime) {
      setEditError('Preencha o horário de início e o de término.')
      return
    }
    if (editEndTime <= editTime) {
      setEditError('O término precisa ser depois do início.')
      return
    }
    if (!capacityNumber || capacityNumber < 1) {
      setEditError('Informe quantas pessoas o grupo terá.')
      return
    }
    setEditSaving(true)
    try {
      await updateMentoriaGrupoSlot({
        data: { id, time: editTime, endTime: editEndTime, title: editTitle, description: editDescription, capacity: capacityNumber },
      })
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
      <VoltarAoPainel />
      <h1>Gerenciar mentorias em grupo</h1>
      <p className="panel-subtitle">
        Cadastre os grupos com o assunto, o horário e o número de vagas. O título e a descrição são o que o aluno lê
        pra decidir se entra. Você pode editar tudo depois.
      </p>

      <form onSubmit={handleAdd} className="panel-card" style={{ maxWidth: 560 }}>
        <div className="field">
          <label htmlFor="grupo-titulo">Título</label>
          <input
            id="grupo-titulo"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Ex.: Como construir a proposta de intervenção"
          />
        </div>
        <div className="field">
          <label htmlFor="grupo-descricao">Descrição</label>
          <textarea
            id="grupo-descricao"
            rows={3}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="O que vocês vão ver nesse encontro, e pra quem ele é."
          />
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div className="field" style={{ flex: '1 1 140px' }}>
            <label htmlFor="grupo-data">Data</label>
            <input id="grupo-data" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </div>
          <div className="field" style={{ flex: '1 1 110px' }}>
            <label htmlFor="grupo-inicio">Início</label>
            <input id="grupo-inicio" type="time" value={time} onChange={(event) => setTime(event.target.value)} />
          </div>
          <div className="field" style={{ flex: '1 1 110px' }}>
            <label htmlFor="grupo-fim">Término</label>
            <input id="grupo-fim" type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} />
          </div>
          <div className="field" style={{ flex: '0 0 90px' }}>
            <label htmlFor="grupo-vagas">Vagas</label>
            <input id="grupo-vagas" type="number" min={1} value={capacity} onChange={(event) => setCapacity(event.target.value)} />
          </div>
        </div>
        <button type="submit" disabled={saving} className="btn btn-primary" style={{ width: 'fit-content' }}>
          {saving ? 'Adicionando...' : 'Adicionar grupo'}
        </button>
        {error && <p className="form-error">{error}</p>}
      </form>

      <section>
        <h2 className="panel-section-title">Grupos cadastrados</h2>
        {loading && <p className="panel-subtitle">Carregando...</p>}
        <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
          {sorted.map((slot) => {
            const isEditing = editingId === slot.id
            return (
              <div key={slot.id} className="list-row" style={{ alignItems: 'flex-start' }}>
                {isEditing ? (
                  <div style={{ display: 'grid', gap: 12, flex: 1 }}>
                    <div className="field">
                      <label>Título</label>
                      <input value={editTitle} onChange={(event) => setEditTitle(event.target.value)} />
                    </div>
                    <div className="field">
                      <label>Descrição</label>
                      <textarea rows={2} value={editDescription} onChange={(event) => setEditDescription(event.target.value)} />
                    </div>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      <div className="field" style={{ flex: '1 1 110px' }}>
                        <label>Início</label>
                        <input type="time" value={editTime} onChange={(event) => setEditTime(event.target.value)} />
                      </div>
                      <div className="field" style={{ flex: '1 1 110px' }}>
                        <label>Término</label>
                        <input type="time" value={editEndTime} onChange={(event) => setEditEndTime(event.target.value)} />
                      </div>
                      <div className="field" style={{ flex: '0 0 80px' }}>
                        <label>Vagas</label>
                        <input
                          type="number"
                          min={slot.students.length || 1}
                          value={editCapacity}
                          onChange={(event) => setEditCapacity(event.target.value)}
                        />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <button onClick={() => handleSaveEdit(slot.id)} disabled={editSaving} className="btn btn-primary btn-sm">
                        {editSaving ? 'Salvando...' : 'Salvar'}
                      </button>
                      <button onClick={cancelEdit} disabled={editSaving} className="btn btn-ghost btn-sm">
                        Cancelar
                      </button>
                    </div>
                    {editError && <p className="form-error" style={{ margin: 0 }}>{editError}</p>}
                  </div>
                ) : (
                  <div style={{ minWidth: 0 }}>
                    <b style={{ color: 'var(--navy)' }}>{slot.title || MENTORIA_GRUPO_TITULO_PADRAO}</b>
                    <div className="list-meta" style={{ marginTop: 2 }}>
                      {slot.date} · {formatarHora(slot.time)} às {formatarHora(terminoDoGrupo(slot))} · {slot.students.length}/{slot.capacity} vagas
                    </div>
                    {slot.description && (
                      <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>{slot.description}</div>
                    )}
                    {slot.students.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                        {slot.students.map((student) => {
                          const chave = `${slot.id}__${student.email}`
                          const removendo = removingStudent === chave
                          return (
                            <span
                              key={student.email}
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 6px 3px 10px',
                                color: 'var(--purple)', background: 'var(--lilac-tint)', borderRadius: 999, fontSize: 12, fontWeight: 600,
                              }}
                            >
                              {student.name}
                              <button
                                onClick={() => handleRemoveStudent(slot.id, student.email, student.name)}
                                disabled={removendo}
                                aria-label={`Remover ${student.name} do grupo`}
                                title="Remover do grupo"
                                style={{
                                  display: 'grid', placeItems: 'center', width: 16, height: 16, padding: 0,
                                  color: 'inherit', background: 'rgba(109,40,217,.14)', border: 0, borderRadius: '50%',
                                  cursor: removendo ? 'default' : 'pointer', opacity: removendo ? 0.5 : 1,
                                }}
                              >
                                <X size={10} />
                              </button>
                            </span>
                          )
                        })}
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
