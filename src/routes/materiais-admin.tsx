import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { useEffect, useState, type FormEvent } from 'react'
import { readLocalUser } from '@/lib/identity-context'
import { getServerUser } from '@/lib/auth'
import { userHasRole } from '@/lib/roles'
import { addMaterial, deleteMaterial, listMaterials, type Material } from '@/lib/materials'

export const Route = createFileRoute('/materiais-admin')({
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
  component: MateriaisAdminPage,
})

const ACCENT_OPTIONS = [
  { label: 'Roxo', value: '#6d28d9' },
  { label: 'Azul', value: '#0f7890' },
  { label: 'Dourado', value: '#c8a24d' },
]

type MaterialMeta = Omit<Material, 'fileDataUrl'>

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Não foi possível ler o arquivo.'))
    reader.readAsDataURL(file)
  })
}

function MateriaisAdminPage() {
  const [materials, setMaterials] = useState<MaterialMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [tag, setTag] = useState('Material')
  const [accent, setAccent] = useState(ACCENT_OPTIONS[0].value)
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const data = await listMaterials()
      setMaterials(data as MaterialMeta[])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')

    if (!title.trim()) {
      setError('Dê um título para o material.')
      return
    }
    if (!file) {
      setError('Escolha um arquivo Word (.doc/.docx) ou PDF para enviar.')
      return
    }

    setSaving(true)
    try {
      const fileDataUrl = await readFileAsDataUrl(file)
      await addMaterial({
        data: { title, description, tag, accent, fileName: file.name, fileDataUrl },
      })
      setTitle('')
      setDescription('')
      setTag('Material')
      setFile(null)
      const input = document.getElementById('material-file-input') as HTMLInputElement | null
      if (input) input.value = ''
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível enviar o arquivo.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este material? Os alunos não vão mais conseguir baixá-lo.')) return
    await deleteMaterial({ data: { id } })
    await load()
  }

  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px', fontFamily: 'sans-serif' }}>
      <Link to="/dashboard" style={{ color: '#6d28d9', fontWeight: 700, textDecoration: 'none' }}>← Voltar ao dashboard</Link>
      <h1 style={{ fontFamily: 'var(--serif, serif)', color: '#0f2342', marginTop: 16 }}>Materiais dos alunos</h1>
      <p style={{ color: '#6b7280' }}>
        Envie arquivos em Word (.doc/.docx) ou PDF. Eles aparecem na área do aluno, em "Arquivos exclusivos",
        prontos para download.
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12, marginTop: 24, maxWidth: 480 }}>
        <div>
          <label style={{ display: 'block', fontSize: 13, marginBottom: 4, color: '#0f2342', fontWeight: 600 }}>Título</label>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Ex.: Mapa mental da redação"
            style={{ width: '100%', padding: 10, border: '1px solid #e0dcf0', borderRadius: 8, boxSizing: 'border-box' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 13, marginBottom: 4, color: '#0f2342', fontWeight: 600 }}>Descrição</label>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Breve descrição do conteúdo do material"
            rows={3}
            style={{ width: '100%', padding: 10, border: '1px solid #e0dcf0', borderRadius: 8, boxSizing: 'border-box', fontFamily: 'inherit' }}
          />
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: 13, marginBottom: 4, color: '#0f2342', fontWeight: 600 }}>Etiqueta</label>
            <input
              value={tag}
              onChange={(event) => setTag(event.target.value)}
              placeholder="Ex.: Estratégia, Exclusivo..."
              style={{ width: '100%', padding: 10, border: '1px solid #e0dcf0', borderRadius: 8, boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: 13, marginBottom: 4, color: '#0f2342', fontWeight: 600 }}>Cor</label>
            <select
              value={accent}
              onChange={(event) => setAccent(event.target.value)}
              style={{ width: '100%', padding: 10, border: '1px solid #e0dcf0', borderRadius: 8, boxSizing: 'border-box' }}
            >
              {ACCENT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 13, marginBottom: 4, color: '#0f2342', fontWeight: 600 }}>Arquivo (Word ou PDF)</label>
          <input
            id="material-file-input"
            type="file"
            accept=".doc,.docx,.pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          style={{ background: '#6d28d9', color: '#fff', border: 'none', borderRadius: 8, padding: '11px 20px', fontWeight: 700, cursor: 'pointer', width: 'fit-content' }}
        >
          {saving ? 'Enviando...' : 'Adicionar material'}
        </button>
        {error && <p style={{ color: '#dc2626', margin: 0 }}>{error}</p>}
      </form>

      <section style={{ marginTop: 32 }}>
        <h2 style={{ fontSize: 18, color: '#0f2342' }}>Materiais enviados</h2>
        {loading && <p>Carregando...</p>}
        <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
          {materials.map((material) => (
            <div
              key={material.id}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', border: '1px solid #e0dcf0', borderRadius: 10, padding: 14 }}
            >
              <div>
                <b>{material.title}</b>
                <div style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>{material.fileName} · {material.tag}</div>
              </div>
              <button
                onClick={() => handleDelete(material.id)}
                style={{ color: '#dc2626', background: 'none', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 14px', cursor: 'pointer' }}
              >
                Excluir
              </button>
            </div>
          ))}
          {!loading && materials.length === 0 && <p style={{ color: '#6b7280' }}>Nenhum material enviado ainda.</p>}
        </div>
      </section>
    </main>
  )
}
