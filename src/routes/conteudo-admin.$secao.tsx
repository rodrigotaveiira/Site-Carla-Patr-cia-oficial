import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { useEffect, useState, type FormEvent } from 'react'
import { readLocalUser } from '@/lib/identity-context'
import { getServerUser } from '@/lib/auth'
import { userHasRole } from '@/lib/roles'
import {
  addContentItem, CONTENT_SECTIONS, deleteContentItem, isContentSection,
  listContentItems, type ContentItem, type ContentSection,
} from '@/lib/content-library'

export const Route = createFileRoute('/conteudo-admin/$secao')({
  beforeLoad: async ({ params }) => {
    if (!isContentSection(params.secao)) throw redirect({ to: '/admin' })

    if (typeof window !== 'undefined') {
      const localUser = readLocalUser()
      if (localUser && userHasRole(localUser, 'admin')) return { user: localUser }
    }

    const user = await getServerUser()
    if (!user) throw redirect({ to: '/login' })
    if (!userHasRole(user, 'admin')) throw redirect({ to: '/dashboard' })
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
  const { secao } = Route.useParams()
  const section = secao as ContentSection
  const sectionLabel = CONTENT_SECTIONS[section]

  const [items, setItems] = useState<ItemMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
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
      const input = document.getElementById('content-file-input') as HTMLInputElement | null
      if (input) input.value = ''
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível enviar o arquivo.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este arquivo?')) return
    await deleteContentItem({ data: { section, id } })
    await load()
  }

  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px', fontFamily: 'sans-serif' }}>
      <Link to="/admin" style={{ color: '#6d28d9', fontWeight: 700, textDecoration: 'none' }}>← Voltar ao painel admin</Link>
      <h1 style={{ fontFamily: 'var(--serif, serif)', color: '#0f2342', marginTop: 16 }}>{sectionLabel} · Arquivos em PDF</h1>
      <p style={{ color: '#6b7280' }}>Envie os PDFs que vão aparecer para os alunos na seção "{sectionLabel}".</p>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12, marginTop: 24, maxWidth: 480 }}>
        <div>
          <label style={{ display: 'block', fontSize: 13, marginBottom: 4, color: '#0f2342', fontWeight: 600 }}>Título</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: '100%', padding: 10, border: '1px solid #e0dcf0', borderRadius: 8, boxSizing: 'border-box' }} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 13, marginBottom: 4, color: '#0f2342', fontWeight: 600 }}>Descrição</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} style={{ width: '100%', padding: 10, border: '1px solid #e0dcf0', borderRadius: 8, boxSizing: 'border-box', fontFamily: 'inherit' }} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 13, marginBottom: 4, color: '#0f2342', fontWeight: 600 }}>Arquivo (PDF)</label>
          <input id="content-file-input" type="file" accept=".pdf,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </div>
        <button type="submit" disabled={saving} style={{ background: '#6d28d9', color: '#fff', border: 'none', borderRadius: 8, padding: '11px 20px', fontWeight: 700, cursor: 'pointer', width: 'fit-content' }}>
          {saving ? 'Enviando...' : 'Adicionar arquivo'}
        </button>
        {error && <p style={{ color: '#dc2626', margin: 0 }}>{error}</p>}
      </form>

      <section style={{ marginTop: 32 }}>
        <h2 style={{ fontSize: 18, color: '#0f2342' }}>Arquivos enviados</h2>
        {loading && <p>Carregando...</p>}
        <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
          {items.map((item) => (
            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', border: '1px solid #e0dcf0', borderRadius: 10, padding: 14 }}>
              <div>
                <b>{item.title}</b>
                <div style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>{item.fileName}</div>
              </div>
              <button onClick={() => handleDelete(item.id)} style={{ color: '#dc2626', background: 'none', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 14px', cursor: 'pointer' }}>Excluir</button>
            </div>
          ))}
          {!loading && items.length === 0 && <p style={{ color: '#6b7280' }}>Nenhum arquivo enviado ainda.</p>}
        </div>
      </section>
    </main>
  )
}
