import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { GraduationCap, Trash2, Upload } from 'lucide-react'
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { readLocalUser } from '@/lib/identity-context'
import { getServerUser } from '@/lib/auth'
import { userHasRole } from '@/lib/roles'
import { addAprovado, deleteAprovado, listAprovados, type ApprovedStudent } from '@/lib/aprovados'
import { useToast } from '@/lib/toast'

export const Route = createFileRoute('/aprovados-admin')({
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
  component: AprovadosAdminPage,
})

// Lado mais longo da foto depois de redimensionada — suficiente pra exibir
// nítido nos cards da galeria (mesmo em telas retina) sem pesar o upload.
const MAX_PHOTO_DIMENSION = 900
const PHOTO_QUALITY = 0.85

// Redimensiona e comprime a foto no navegador antes de enviar: fotos de
// celular costumam vir com 3–8MB, e a galeria não precisa disso — deixa o
// cadastro rápido e a página do aluno leve mesmo com muitos aprovados.
function resizeAndCompressPhoto(file: File): Promise<{ fileName: string; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        let { width, height } = img
        if (width > height && width > MAX_PHOTO_DIMENSION) {
          height = Math.round(height * (MAX_PHOTO_DIMENSION / width))
          width = MAX_PHOTO_DIMENSION
        } else if (height > MAX_PHOTO_DIMENSION) {
          width = Math.round(width * (MAX_PHOTO_DIMENSION / height))
          height = MAX_PHOTO_DIMENSION
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) { reject(new Error('Não foi possível processar essa imagem.')); return }
        ctx.drawImage(img, 0, 0, width, height)
        resolve({
          fileName: `${file.name.replace(/\.[^./]+$/, '') || 'foto'}.jpg`,
          dataUrl: canvas.toDataURL('image/jpeg', PHOTO_QUALITY),
        })
      }
      img.onerror = () => reject(new Error('Não foi possível ler essa imagem.'))
      img.src = reader.result as string
    }
    reader.onerror = () => reject(new Error('Não foi possível ler o arquivo.'))
    reader.readAsDataURL(file)
  })
}

function AprovadosAdminPage() {
  const showToast = useToast()
  const [items, setItems] = useState<ApprovedStudent[]>([])
  const [loading, setLoading] = useState(true)

  const [name, setName] = useState('')
  const [university, setUniversity] = useState('')
  const [course, setCourse] = useState('')
  const [year, setYear] = useState('')
  const [quote, setQuote] = useState('')
  const [photo, setPhoto] = useState<{ fileName: string; dataUrl: string } | null>(null)
  const [photoError, setPhotoError] = useState('')
  const [processingPhoto, setProcessingPhoto] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    try {
      setItems(await listAprovados())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  async function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) { setPhotoError('Escolha um arquivo de imagem (JPG, PNG ou WEBP).'); return }
    if (file.size > 15 * 1024 * 1024) { setPhotoError('Essa imagem é muito grande. Escolha uma foto de até 15MB.'); return }

    setPhotoError('')
    setProcessingPhoto(true)
    try {
      setPhoto(await resizeAndCompressPhoto(file))
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'Não foi possível processar a foto.')
    } finally {
      setProcessingPhoto(false)
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')

    if (!name.trim()) { setError('Informe o nome do aluno.'); return }
    if (!university.trim()) { setError('Informe a faculdade/universidade.'); return }
    if (!photo) { setError('Envie uma foto do aluno.'); return }

    setSaving(true)
    try {
      await addAprovado({
        data: { name, university, course, year, quote, photoFileName: photo.fileName, photoDataUrl: photo.dataUrl },
      })
      setName('')
      setUniversity('')
      setCourse('')
      setYear('')
      setQuote('')
      setPhoto(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      await load()
      showToast('Aprovado adicionado à galeria.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string, studentName: string) {
    if (!confirm(`Remover "${studentName}" da galeria de aprovados?`)) return
    try {
      await deleteAprovado({ data: { id } })
      await load()
      showToast('Removido da galeria.')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Não foi possível remover.', 'error')
    }
  }

  return (
    <main className="panel panel-wide">
      <Link to="/dashboard" className="panel-back">← Voltar ao dashboard</Link>
      <h1><GraduationCap /> Galeria dos Aprovados</h1>
      <p className="panel-subtitle">
        Cadastre os alunos aprovados na faculdade. Eles aparecem na área do aluno, num mural de conquistas visível
        pra toda a turma.
      </p>

      <form onSubmit={handleSubmit} className="panel-card" style={{ maxWidth: 520, marginTop: 20 }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              style={{ display: 'none' }}
              id="aprovado-photo-input"
            />
            <label
              htmlFor="aprovado-photo-input"
              style={{
                display: 'grid', placeItems: 'center', width: 96, height: 120, overflow: 'hidden',
                background: photo ? 'transparent' : 'var(--lilac-tint)', border: '2px dashed #c9befd', borderRadius: 10,
                cursor: 'pointer', flexShrink: 0,
              }}
            >
              {photo
                ? <img src={photo.dataUrl} alt="Prévia da foto" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <Upload size={20} color="var(--purple)" />}
            </label>
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div className="field" style={{ marginBottom: 10 }}>
              <label>Foto</label>
              <p className="panel-card-hint" style={{ margin: 0 }}>
                {processingPhoto ? 'Processando...' : photo ? 'Foto pronta — toque na imagem pra trocar.' : 'Retrato do aluno, de preferência vertical.'}
              </p>
            </div>
            {photoError && <p className="form-error" style={{ margin: 0 }}>{photoError}</p>}
          </div>
        </div>

        <div className="field">
          <label>Nome do aluno</label>
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nome completo" />
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div className="field" style={{ flex: 2, minWidth: 180 }}>
            <label>Faculdade / universidade</label>
            <input value={university} onChange={(event) => setUniversity(event.target.value)} placeholder="Ex.: USP, UFMG, UERJ..." />
          </div>
          <div className="field" style={{ flex: 1, minWidth: 100 }}>
            <label>Ano</label>
            <input value={year} onChange={(event) => setYear(event.target.value)} placeholder="2026" inputMode="numeric" maxLength={4} />
          </div>
        </div>
        <div className="field">
          <label>Curso (opcional)</label>
          <input value={course} onChange={(event) => setCourse(event.target.value)} placeholder="Ex.: Medicina, Direito..." />
        </div>
        <div className="field">
          <label>Depoimento (opcional)</label>
          <textarea value={quote} onChange={(event) => setQuote(event.target.value)} placeholder="Uma frase curta do aluno sobre a aprovação" rows={3} />
        </div>

        <button type="submit" disabled={saving || processingPhoto} className="btn btn-primary" style={{ width: 'fit-content' }}>
          {saving ? 'Salvando...' : 'Adicionar à galeria'}
        </button>
        {error && <p className="form-error" style={{ margin: 0 }}>{error}</p>}
      </form>

      <section>
        <h2 className="panel-section-title">Aprovados cadastrados</h2>
        {loading && <p className="panel-subtitle">Carregando...</p>}
        <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
          {items.map((item) => (
            <div key={item.id} className="list-row">
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', minWidth: 0 }}>
                <img
                  src={item.photoDataUrl}
                  alt={item.name}
                  style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1px solid var(--line)' }}
                />
                <div style={{ minWidth: 0, wordBreak: 'break-word' }}>
                  <b style={{ color: 'var(--navy)' }}>{item.name}</b>
                  <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 2 }}>
                    {item.university}{item.course ? ` · ${item.course}` : ''}{item.year ? ` · ${item.year}` : ''}
                  </div>
                </div>
              </div>
              <button onClick={() => handleDelete(item.id, item.name)} className="btn btn-danger btn-sm">
                <Trash2 size={14} /> Remover
              </button>
            </div>
          ))}
          {!loading && items.length === 0 && <p className="empty-state">Nenhum aprovado cadastrado ainda.</p>}
        </div>
      </section>
    </main>
  )
}
