import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { Check, MessageCircleHeart, Send, User as UserIcon } from 'lucide-react'
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { readLocalUser, useIdentity } from '@/lib/identity-context'
import { getServerUser } from '@/lib/auth'
import { userHasRole, isStaff } from '@/lib/roles'
import { getMyProfilePhoto, saveMyProfilePhoto } from '@/lib/profile-photo'
import { listMyRecados, sendRecado, type Recado } from '@/lib/recados'

export const Route = createFileRoute('/perfil')({
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
  component: PerfilPage,
})

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=160&q=80'

function PerfilPage() {
  const { user, updateName } = useIdentity()

  // --- foto ---
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const photoInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getMyProfilePhoto()
      .then((saved) => { if (saved) setPhotoUrl(saved) })
      .catch(() => { /* aluno ainda não tem foto salva, sem problema */ })
  }, [])

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) { setPhotoError('Escolha um arquivo de imagem (JPG, PNG ou WEBP).'); return }
    if (file.size > 2 * 1024 * 1024) { setPhotoError('Essa imagem é muito grande. Escolha uma foto de até 2MB.'); return }

    setPhotoError('')
    setUploadingPhoto(true)
    const reader = new FileReader()
    reader.onload = async () => {
      const dataUrl = reader.result as string
      try {
        await saveMyProfilePhoto({ data: { dataUrl } })
        setPhotoUrl(dataUrl)
      } catch (error) {
        setPhotoError(error instanceof Error ? error.message : 'Não foi possível salvar a foto.')
      } finally {
        setUploadingPhoto(false)
      }
    }
    reader.onerror = () => { setPhotoError('Não foi possível ler o arquivo. Tente outra imagem.'); setUploadingPhoto(false) }
    reader.readAsDataURL(file)
  }

  // --- nome ---
  const [name, setName] = useState(user?.name ?? '')
  const [savingName, setSavingName] = useState(false)
  const [nameError, setNameError] = useState('')
  const [nameSaved, setNameSaved] = useState(false)

  useEffect(() => { setName(user?.name ?? '') }, [user?.name])

  async function handleSaveName(event: FormEvent) {
    event.preventDefault()
    setNameError('')
    setNameSaved(false)
    setSavingName(true)
    try {
      await updateName(name)
      setNameSaved(true)
      setTimeout(() => setNameSaved(false), 3000)
    } catch (err) {
      setNameError(err instanceof Error ? err.message : 'Não foi possível salvar o nome.')
    } finally {
      setSavingName(false)
    }
  }

  // --- recado ---
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')
  const [myRecados, setMyRecados] = useState<Recado[]>([])
  const [loadingRecados, setLoadingRecados] = useState(true)

  async function loadRecados() {
    setLoadingRecados(true)
    try {
      setMyRecados(await listMyRecados())
    } catch {
      /* histórico some se der erro, sem travar a página */
    } finally {
      setLoadingRecados(false)
    }
  }

  useEffect(() => { void loadRecados() }, [])

  async function handleSendRecado(event: FormEvent) {
    event.preventDefault()
    setSendError('')
    if (!message.trim()) { setSendError('Escreva sua mensagem antes de enviar.'); return }
    setSending(true)
    try {
      await sendRecado({ data: { message } })
      setMessage('')
      await loadRecados()
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Não foi possível enviar o recado.')
    } finally {
      setSending(false)
    }
  }

  return (
    <main className="panel">
      <Link to="/dashboard" className="panel-back">← Voltar ao dashboard</Link>
      <h1><UserIcon /> Meu perfil</h1>
      <p className="panel-subtitle">Edite sua foto, seu nome e mande um recado direto para a professora.</p>

      <section className="panel-card plain">
        <h2>Foto de perfil</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 14 }}>
          <img
            src={photoUrl || DEFAULT_AVATAR}
            alt="Sua foto de perfil"
            style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '2px solid #fff', boxShadow: '0 4px 14px rgba(15,45,82,.12)' }}
          />
          <div>
            <input ref={photoInputRef} type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: 'none' }} />
            <button type="button" className="btn btn-ghost" onClick={() => photoInputRef.current?.click()} disabled={uploadingPhoto}>
              {uploadingPhoto ? 'Enviando...' : 'Trocar foto'}
            </button>
            <p className="panel-card-hint" style={{ margin: '8px 0 0' }}>JPG, PNG ou WEBP, até 2MB.</p>
          </div>
        </div>
        {photoError && <p className="form-error">{photoError}</p>}
      </section>

      <section className="panel-card plain">
        <h2>Nome</h2>
        <form onSubmit={handleSaveName} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome completo" style={{ flex: 1, minWidth: 200 }} />
          <button type="submit" className="btn btn-primary" disabled={savingName}>
            {nameSaved ? <Check size={15} /> : null} {savingName ? 'Salvando...' : nameSaved ? 'Salvo!' : 'Salvar nome'}
          </button>
        </form>
        {nameError && <p className="form-error">{nameError}</p>}
      </section>

      <section className="panel-card plain">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><MessageCircleHeart size={17} color="var(--purple)" /> Mandar um recado para a Carlinha</h2>
        <p className="panel-card-hint">Uma dúvida, um pedido, um "oi" — sua mensagem chega direto pra ela.</p>
        <form onSubmit={handleSendRecado} style={{ display: 'grid', gap: 10 }}>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Escreva sua mensagem..." rows={4} />
          <button type="submit" className="btn btn-primary" disabled={sending} style={{ width: 'fit-content' }}>
            <Send size={15} /> {sending ? 'Enviando...' : 'Enviar recado'}
          </button>
          {sendError && <p className="form-error" style={{ margin: 0 }}>{sendError}</p>}
        </form>

        {myRecados.length > 0 && (
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
            <b style={{ fontSize: 13, color: 'var(--navy)' }}>Seus recados enviados</b>
            <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
              {myRecados.map((recado) => (
                <div key={recado.id} className="list-row" style={{ display: 'block' }}>
                  <p style={{ margin: 0, color: 'var(--navy)', fontSize: 13, whiteSpace: 'pre-wrap' }}>{recado.message}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: '#9ca3af' }}>
                    <span>{new Date(recado.createdAt).toLocaleDateString('pt-BR')} às {new Date(recado.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                    <span className={recado.read ? 'badge badge-success' : 'badge badge-warning'}>{recado.read ? 'Lido pela professora' : 'Ainda não lido'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {loadingRecados && myRecados.length === 0 && <p className="panel-card-hint" style={{ marginTop: 14 }}>Carregando seus recados...</p>}
      </section>
    </main>
  )
}
