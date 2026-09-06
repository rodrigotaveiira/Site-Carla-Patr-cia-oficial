import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { Upload } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { readLocalUser } from '@/lib/identity-context'
import { getServerUser } from '@/lib/auth'
import { userHasRole } from '@/lib/roles'
import { addMaterial, deleteMaterial, listMaterials, type MaterialListItem } from '@/lib/materials'
import { useToast } from '@/lib/toast'

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

type MaterialMeta = MaterialListItem

// Formata a data da aula (YYYY-MM-DD) direto pelos componentes da string, sem
// passar por Date — evita qualquer deslocamento de fuso horário na exibição.
function formatClassDateTime(classDate: string, classTime: string | null): string {
  const [year, month, day] = classDate.split('-')
  const datePart = `${day}/${month}/${year}`
  return classTime ? `${datePart} às ${classTime}` : datePart
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Não foi possível ler o arquivo.'))
    reader.readAsDataURL(file)
  })
}

function MateriaisAdminPage() {
  const showToast = useToast()
  const [materials, setMaterials] = useState<MaterialMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [tag, setTag] = useState('Material')
  const [accent, setAccent] = useState(ACCENT_OPTIONS[0].value)
  const [classDate, setClassDate] = useState('')
  const [classTime, setClassTime] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
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
      setError('Escolha um arquivo Word (.docx) ou PDF para enviar.')
      return
    }
    if (classDate && !classTime) {
      setError('Informe também o horário da aula, pra liberar o material 15 minutos antes.')
      return
    }

    setSaving(true)
    try {
      const fileDataUrl = await readFileAsDataUrl(file)
      await addMaterial({
        data: {
          title, description, tag, accent, fileName: file.name, fileDataUrl,
          classDate: classDate || undefined,
          classTime: classTime || undefined,
        },
      })
      setTitle('')
      setDescription('')
      setTag('Material')
      setClassDate('')
      setClassTime('')
      setFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      await load()
      showToast('Material adicionado.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível enviar o arquivo.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este material? Os alunos não vão mais conseguir baixá-lo.')) return
    try {
      await deleteMaterial({ data: { id } })
      await load()
      showToast('Material excluído.')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Não foi possível excluir o material.', 'error')
    }
  }

  return (
    <main className="panel">
      <Link to="/dashboard" className="panel-back">← Voltar ao dashboard</Link>
      <h1>Materiais dos alunos</h1>
      <p className="panel-subtitle">
        Envie arquivos em Word (.docx) ou PDF. Eles aparecem na área do aluno, em "Arquivos exclusivos", já
        protegidos com o nome e o CPF de quem baixa.
      </p>

      <form onSubmit={handleSubmit} className="panel-card" style={{ maxWidth: 480 }}>
        <div className="field">
          <label>Título</label>
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex.: Mapa mental da redação" />
        </div>
        <div className="field">
          <label>Descrição</label>
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Breve descrição do conteúdo do material" rows={3} />
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div className="field" style={{ flex: 1, minWidth: 140 }}>
            <label>Data da aula (opcional)</label>
            <input type="date" value={classDate} onChange={(event) => setClassDate(event.target.value)} />
          </div>
          <div className="field" style={{ flex: 1, minWidth: 140 }}>
            <label>Horário da aula</label>
            <input type="time" value={classTime} onChange={(event) => setClassTime(event.target.value)} disabled={!classDate} />
          </div>
        </div>
        <p className="panel-card-hint" style={{ margin: '-8px 0 0' }}>
          Se preenchida, o material só fica disponível para download 15 minutos antes do horário da aula. Depois
          disso, fica liberado para sempre. Deixe em branco pra liberar o material imediatamente.
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div className="field" style={{ flex: 1, minWidth: 140 }}>
            <label>Etiqueta</label>
            <input value={tag} onChange={(event) => setTag(event.target.value)} placeholder="Ex.: Estratégia, Exclusivo..." />
          </div>
          <div className="field" style={{ flex: 1, minWidth: 140 }}>
            <label>Cor</label>
            <select value={accent} onChange={(event) => setAccent(event.target.value)}>
              {ACCENT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="field">
          <label>Arquivo (Word ou PDF)</label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".docx,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
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
          {saving ? 'Enviando...' : 'Adicionar material'}
        </button>
        {error && <p className="form-error" style={{ margin: 0 }}>{error}</p>}
      </form>

      <section>
        <h2 className="panel-section-title">Materiais enviados</h2>
        {loading && <p className="panel-subtitle">Carregando...</p>}
        <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
          {materials.map((material) => (
            <div key={material.id} className="list-row">
              <div style={{ minWidth: 0, wordBreak: 'break-word' }}>
                <b style={{ color: 'var(--navy)' }}>{material.title}</b>
                <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>{material.fileName} · {material.tag}</div>
                {material.classDate && (
                  <div style={{ fontSize: 12, marginTop: 4, fontWeight: 600, color: material.released ? '#15803d' : '#a16207' }}>
                    {material.released
                      ? `Liberado (aula em ${formatClassDateTime(material.classDate, material.classTime)})`
                      : `Libera em ${material.releaseAt ? formatDateTime(material.releaseAt) : ''} (15min antes da aula de ${formatClassDateTime(material.classDate, material.classTime)})`}
                  </div>
                )}
              </div>
              <button onClick={() => handleDelete(material.id)} className="btn btn-danger btn-sm">Excluir</button>
            </div>
          ))}
          {!loading && materials.length === 0 && <p className="empty-state">Nenhum material enviado ainda.</p>}
        </div>
      </section>
    </main>
  )
}
