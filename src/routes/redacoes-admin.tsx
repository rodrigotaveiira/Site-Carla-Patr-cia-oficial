import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { Download } from 'lucide-react'
import { useEffect, useState } from 'react'
import { readLocalUser } from '@/lib/identity-context'
import { getServerUser } from '@/lib/auth'
import { userHasRole } from '@/lib/roles'
import { correctRedacao, getRedacaoFile, listAllRedacoes, type RedacaoSubmission } from '@/lib/redacoes'

export const Route = createFileRoute('/redacoes-admin')({
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
  component: RedacoesAdminPage,
})

type SubmissionMeta = Omit<RedacaoSubmission, 'fileDataUrl'>

function CorrectionForm({ submission, onSaved }: { submission: SubmissionMeta; onSaved: () => void }) {
  const [grade, setGrade] = useState(submission.grade?.toString() ?? '')
  const [feedback, setFeedback] = useState(submission.feedback ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    setError('')
    const numericGrade = Number(grade)
    if (Number.isNaN(numericGrade)) { setError('Digite uma nota válida.'); return }

    setSaving(true)
    try {
      await correctRedacao({ data: { id: submission.id, grade: numericGrade, feedback } })
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar a correção.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ display: 'grid', gap: 8, marginTop: 12, background: '#f9f8fd', borderRadius: 8, padding: 12 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: '#0f2342' }}>Nota (0–1000)</label>
        <input type="number" min={0} max={1000} value={grade} onChange={(e) => setGrade(e.target.value)} style={{ width: 90, padding: 8, border: '1px solid #e0dcf0', borderRadius: 6 }} />
      </div>
      <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Comentário para o aluno" rows={3} style={{ width: '100%', padding: 8, border: '1px solid #e0dcf0', borderRadius: 6, boxSizing: 'border-box', fontFamily: 'inherit' }} />
      <button onClick={handleSave} disabled={saving} style={{ background: '#6d28d9', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 16px', fontWeight: 700, cursor: 'pointer', width: 'fit-content' }}>
        {saving ? 'Salvando...' : 'Salvar correção'}
      </button>
      {error && <p style={{ color: '#dc2626', margin: 0, fontSize: 13 }}>{error}</p>}
    </div>
  )
}

function RedacoesAdminPage() {
  const [submissions, setSubmissions] = useState<SubmissionMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      setSubmissions(await listAllRedacoes())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

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

  const pendentes = submissions.filter((s) => s.status === 'pendente')
  const corrigidas = submissions.filter((s) => s.status === 'corrigida')

  function renderCard(submission: SubmissionMeta) {
    return (
      <div key={submission.id} style={{ background: '#fff', border: '1px solid #e0dcf0', borderRadius: 10, padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ minWidth: 0, wordBreak: 'break-word' }}>
            <b style={{ color: '#0f2342' }}>{submission.title}</b>
            <div style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>
              {submission.studentName} · {submission.studentEmail}
            </div>
            <div style={{ color: '#9ca3af', fontSize: 12, marginTop: 2 }}>
              Enviada em {new Date(submission.submittedAt).toLocaleDateString('pt-BR')}
            </div>
          </div>
          <button
            onClick={() => handleDownload(submission.id)}
            disabled={downloadingId === submission.id}
            style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', color: '#6d28d9', background: 'none', border: '1px solid #e0dcf0', borderRadius: 8, padding: '8px 12px', cursor: 'pointer', fontWeight: 600 }}
          >
            <Download size={14} /> {downloadingId === submission.id ? 'Abrindo...' : 'Ver arquivo'}
          </button>
        </div>

        {submission.status === 'corrigida' && (
          <div style={{ marginTop: 10, color: '#15803d', fontSize: 13, fontWeight: 700 }}>Nota: {submission.grade}</div>
        )}

        <button
          onClick={() => setOpenId(openId === submission.id ? null : submission.id)}
          style={{ marginTop: 10, color: '#6d28d9', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, padding: 0 }}
        >
          {openId === submission.id ? 'Fechar' : submission.status === 'corrigida' ? 'Editar correção' : 'Corrigir'}
        </button>

        {openId === submission.id && (
          <CorrectionForm submission={submission} onSaved={() => { setOpenId(null); void load() }} />
        )}
      </div>
    )
  }

  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px', fontFamily: 'sans-serif' }}>
      <Link to="/admin" style={{ color: '#6d28d9', fontWeight: 700, textDecoration: 'none' }}>← Voltar ao painel admin</Link>
      <h1 style={{ fontFamily: 'var(--serif, serif)', color: '#0f2342', marginTop: 16 }}>Correção de redações</h1>
      <p style={{ color: '#6b7280' }}>Veja as redações enviadas pelos alunos e envie a nota e o comentário.</p>

      {loading && <p style={{ color: '#6b7280' }}>Carregando...</p>}

      <section style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 16, color: '#a16207' }}>Aguardando correção ({pendentes.length})</h2>
        <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
          {pendentes.map(renderCard)}
          {!loading && pendentes.length === 0 && <p style={{ color: '#6b7280' }}>Nenhuma redação pendente.</p>}
        </div>
      </section>

      <section style={{ marginTop: 32 }}>
        <h2 style={{ fontSize: 16, color: '#15803d' }}>Já corrigidas ({corrigidas.length})</h2>
        <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
          {corrigidas.map(renderCard)}
          {!loading && corrigidas.length === 0 && <p style={{ color: '#6b7280' }}>Nenhuma redação corrigida ainda.</p>}
        </div>
      </section>
    </main>
  )
}
