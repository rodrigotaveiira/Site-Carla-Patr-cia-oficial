import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { Upload } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { readLocalUser } from '@/lib/identity-context'
import { getServerUser } from '@/lib/auth'
import { userHasRole } from '@/lib/roles'
import {
  addContentItem, CONTENT_SECTIONS, deleteContentItem, isContentSection,
  listContentItems, type ContentItem, type ContentSection,
} from '@/lib/content-library'
import { useToast } from '@/lib/toast'

export const Route = createFileRoute('/conteudo-admin/$secao')({
  beforeLoad: async ({ params }) => {
    if (!isContentSection(params.secao)) throw redirect({ to: '/admin' })

    // "admin" acessa qualquer seção. "professor" só acessa Dicas e Gabaritos.
    const canManage = (user: unknown) =>
      userHasRole(user, 'admin')
      || ((params.secao === 'dicas' || params.secao === 'gabaritos') && userHasRole(user, 'professor'))

    if (typeof window !== 'undefined') {
      const localUser = readLocalUser()
      if (localUser && canManage(localUser)) return { user: localUser }
    }

    const user = await getServerUser()
    if (!user) throw redirect({ to: '/login' })
    if (!canManage(user)) throw redirect({ to: '/dashboard' })
    return { user }
  },
  component: ConteudoAdminPage,
})

type ItemMeta = Omit<ContentItem, 'fileDataUrl'>

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Não foi possível ler o arquivo.'))
    reader.readAsDataURL(file)
  })
}

function ConteudoAdminPage() {
  const showToast = useToast()
  const { secao } = Route.useParams()
  const section = secao as ContentSection
  const sectionLabel = CONTENT_SECTIONS[section]

  const [items, setItems] = useState<ItemMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const data = await listContentItems({ data: { section } })
      setItems(data as ItemMeta[])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    if (!title.trim()) { setError('Dê um título para o arquivo.'); return }
    if (!file) { setError('Escolha um arquivo PDF para enviar.'); return }

    setSaving(true)
    try {
      const fileDataUrl = await readFileAsDataUrl(file)
      await addContentItem({ data: { section, title, description, fileName: file.name, fileDataUrl } })
      setTitle('')
      setDescription('')
      setFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      await load()
      showToast('Arquivo adicionado.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível enviar o arquivo.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este arquivo?')) return
    try {
      await deleteContentItem({ data: { section, id } })
      await load()
      showToast('Arquivo excluído.')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Não foi possível excluir o arquivo.', 'error')
    }
  }

  return (
    <main className="panel">
      <Link to="/admin" className="panel-back">← Voltar ao painel admin</Link>
      <h1>{sectionLabel} · Arquivos em PDF</h1>
      <p className="panel-subtitle">Envie os PDFs que vão aparecer para os alunos na seção "{sectionLabel}".</p>

      <form onSubmit={handleSubmit} className="panel-card" style={{ maxWidth: 480 }}>
        <div className="field">
          <label>Título</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="field">
          <label>Descrição</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
        </div>
        <div className="field">
          <label>Arquivo (PDF)</label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            style={{ display: 'none' }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', boxSizing: 'border-box', padding: '14px 16px', background: 'var(--lilac-tint)', border: '2px dashed #c9befd', borderRadius: 8, color: 'var(--purple)', fontWeight: 700, cursor: 'pointer' }}
          >
            <Upload size={18} /> {file ? file.name : 'Toque aqui para escolher o arquivo'}
          </button>
        </div>
        <button type="submit" disabled={saving} className="btn btn-primary" style={{ width: 'fit-content' }}>
          {saving ? 'Enviando...' : 'Adicionar arquivo'}
        </button>
        {error && <p className="form-error" style={{ margin: 0 }}>{error}</p>}
      </form>

      <section>
        <h2 className="panel-section-title">Arquivos enviados</h2>
        {loading && <p className="panel-subtitle">Carregando...</p>}
        <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
          {items.map((item) => (
            <div key={item.id} className="list-row">
              <div style={{ minWidth: 0, wordBreak: 'break-word' }}>
                <b style={{ color: 'var(--navy)' }}>{item.title}</b>
                <div className="list-meta" style={{ marginTop: 4 }}>{item.fileName}</div>
              </div>
              <button onClick={() => handleDelete(item.id)} className="btn btn-danger btn-sm">Excluir</button>
            </div>
          ))}
          {!loading && items.length === 0 && <p className="empty-state">Nenhum arquivo enviado ainda.</p>}
        </div>
      </section>
    </main>
  )
}
