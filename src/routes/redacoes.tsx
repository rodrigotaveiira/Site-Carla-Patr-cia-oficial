import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { Download, Upload } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { readLocalUser } from '@/lib/identity-context'
import { getServerUser } from '@/lib/auth'
import { userHasRole, isStaff } from '@/lib/roles'
import { getRedacaoFile, listMyRedacoes, submitRedacao, type RedacaoSubmission } from '@/lib/redacoes'

export const Route = createFileRoute('/redacoes')({
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
  component: RedacoesPage,
})

type SubmissionMeta = Omit<RedacaoSubmission, 'fileDataUrl'>

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Não foi possível ler o arquivo.'))
    reader.readAsDataURL(file)
  })
}

function RedacoesPage() {
  const [submissions, setSubmissions] = useState<SubmissionMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      setSubmissions(await listMyRedacoes())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    if (!file) { setError('Escolha uma foto ou um arquivo da sua redação.'); return }

    setSaving(true)
    try {
      const fileDataUrl = await readFileAsDataUrl(file)
      await submitRedacao({ data: { title, fileName: file.name, fileDataUrl } })
      setTitle('')
      setFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível enviar sua redação.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDownload(id: string) {
    setDownloadingId(id)
    try {
      const { fileName, fileDataUrl } = await getRedacaoFile({ data: { id } })
      const link = document.createElement('a')
      link.download = fileName
      link.href = fileDataUrl
      link.click()
    } finally {
      setDownloadingId(null)
    }
  }

  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px', fontFamily: 'sans-serif' }}>
      <Link to="/dashboard" style={{ color: '#6d28d9', fontWeight: 700, textDecoration: 'none' }}>← Voltar ao dashboard</Link>
      <h1 style={{ fontFamily: 'var(--serif, serif)', color: '#0f2342', marginTop: 16 }}>Redações</h1>
      <p style={{ color: '#6b7280' }}>Envie uma foto ou arquivo da sua redação para correção da professora.</p>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12, marginTop: 24, maxWidth: 480, background: '#f9f8fd', border: '1px solid #ece8f7', borderRadius: 10, padding: 20 }}>
        <div>
          <label style={{ display: 'block', fontSize: 13, marginBottom: 4, color: '#0f2342', fontWeight: 600 }}>Tema (opcional)</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Inteligência artificial e sociedade" style={{ width: '100%', padding: 10, border: '1px solid #e0dcf0', borderRadius: 8, boxSizing: 'border-box' }} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 13, marginBottom: 4, color: '#0f2342', fontWeight: 600 }}>Foto ou arquivo da redação</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,.doc,.docx"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            style={{ display: 'none' }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', boxSizing: 'border-box', padding: '14px 16px', background: '#fff', border: '2px dashed #c9befd', borderRadius: 8, color: '#6d28d9', fontWeight: 700, cursor: 'pointer' }}
          >
            <Upload size={18} /> {file ? file.name : 'Toque aqui para escolher a foto ou arquivo'}
          </button>
        </div>
        <button type="submit" disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#6d28d9', color: '#fff', border: 'none', borderRadius: 8, padding: '11px 20px', fontWeight: 700, cursor: 'pointer', width: 'fit-content' }}>
          <Upload size={16} /> {saving ? 'Enviando...' : 'Enviar redação'}
        </button>
        {error && <p style={{ color: '#dc2626', margin: 0 }}>{error}</p>}
      </form>

      {(() => {
        const corrected = submissions.filter((s) => s.status === 'corrigida' && s.grade !== null)
        if (corrected.length < 2) return null
        const chronological = [...corrected].sort((a, b) => (a.correctedAt ?? '').localeCompare(b.correctedAt ?? ''))
        const maxGrade = Math.max(...chronological.map((s) => s.grade ?? 0), 1)
        return (
          <section style={{ marginTop: 32 }}>
            <h2 style={{ fontSize: 18, color: '#0f2342' }}>Evolução das suas notas</h2>
            <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>Suas últimas correções, na ordem em que foram feitas.</p>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, marginTop: 16, height: 140, padding: '0 4px', overflowX: 'auto' }}>
              {chronological.map((submission) => (
                <div key={submission.id} title={submission.title} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 44 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#0f2342' }}>{submission.grade}</span>
                  <div style={{ width: 24, height: `${Math.max(6, ((submission.grade ?? 0) / maxGrade) * 90)}px`, background: 'linear-gradient(180deg, #a855f7, #6d28d9)', borderRadius: 4 }} />
                  <span style={{ fontSize: 10, color: '#9ca3af' }}>{new Date(submission.correctedAt ?? submission.submittedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
                </div>
              ))}
            </div>
          </section>
        )
      })()}

      <section style={{ marginTop: 32 }}>
        <h2 style={{ fontSize: 18, color: '#0f2342' }}>Suas redações enviadas</h2>
        {loading && <p style={{ color: '#6b7280' }}>Carregando...</p>}
        <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
          {submissions.map((submission) => (
            <div key={submission.id} style={{ background: '#fff', border: '1px solid #e0dcf0', borderRadius: 10, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ minWidth: 0, wordBreak: 'break-word' }}>
                  <b style={{ color: '#0f2342' }}>{submission.title}</b>
                  <div style={{ color: '#9ca3af', fontSize: 12, marginTop: 4 }}>
                    Enviada em {new Date(submission.submittedAt).toLocaleDateString('pt-BR')}
                  </div>
                </div>
                <span style={{
                  fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 20,
                  color: submission.status === 'corrigida' ? '#15803d' : '#a16207',
                  background: submission.status === 'corrigida' ? '#dcfce7' : '#fef9c3',
                }}>
                  {submission.status === 'corrigida' ? 'Corrigida' : 'Aguardando correção'}
                </span>
              </div>

              {submission.status === 'corrigida' && (
                <div style={{ marginTop: 12, background: '#f4f2fb', borderRadius: 8, padding: 12 }}>
                  <div style={{ fontWeight: 800, color: '#6d28d9', fontSize: 20 }}>{submission.grade}/40</div>
                  {submission.competencyScores && submission.competencyScores.length > 0 && (
                    <div style={{ display: 'grid', gap: 6, marginTop: 10 }}>
                      {submission.competencyScores.map((score) => (
                        <div key={score.id}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#4b5563' }}>
                            <span>{score.label}</span>
                            <span>{score.value} / {score.maxValue}</span>
                          </div>
                          <div style={{ height: 5, background: '#e5e0f5', borderRadius: 4, overflow: 'hidden', marginTop: 3 }}>
                            <div style={{ width: `${(score.value / score.maxValue) * 100}%`, height: '100%', background: 'linear-gradient(90deg, #a855f7, #6d28d9)' }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {submission.feedback && <p style={{ color: '#4b5563', fontSize: 14, margin: '10px 0 0' }}>{submission.feedback}</p>}
                </div>
              )}

              <button
                onClick={() => handleDownload(submission.id)}
                disabled={downloadingId === submission.id}
                style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, color: '#6d28d9', background: 'none', border: '1px solid #e0dcf0', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontWeight: 600 }}
              >
                <Download size={14} /> {downloadingId === submission.id ? 'Abrindo...' : 'Ver arquivo enviado'}
              </button>
            </div>
          ))}
          {!loading && submissions.length === 0 && <p style={{ color: '#6b7280' }}>Você ainda não enviou nenhuma redação.</p>}
        </div>
      </section>
    </main>
  )
}
