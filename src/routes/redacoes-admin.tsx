import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { ChevronDown, ChevronUp, Download, HandHelping, PenLine, Settings } from 'lucide-react'
import { useEffect, useState } from 'react'
import { readLocalUser } from '@/lib/identity-context'
import { getServerUser } from '@/lib/auth'
import { isStaff } from '@/lib/roles'
import { getCompetencyScheme, updateCompetencyScheme, type Competency } from '@/lib/competencies'
import { correctRedacao, getRedacaoFile, listAllRedacoes, type CompetencyScore, type RedacaoSubmission } from '@/lib/redacoes'
import { useToast } from '@/lib/toast'

export const Route = createFileRoute('/redacoes-admin')({
  beforeLoad: async () => {
    if (typeof window !== 'undefined') {
      const localUser = readLocalUser()
      if (localUser && isStaff(localUser)) return { user: localUser }
    }

    const user = await getServerUser()
    if (!user) throw redirect({ to: '/login' })
    if (!isStaff(user)) throw redirect({ to: '/dashboard' })
    return { user }
  },
  component: RedacoesAdminPage,
})

type SubmissionMeta = Omit<RedacaoSubmission, 'fileDataUrl'>

function SchemeEditor({ scheme, onSaved }: { scheme: Competency[]; onSaved: (scheme: Competency[]) => void }) {
  const showToast = useToast()
  const [rows, setRows] = useState<Competency[]>(scheme)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function updateRow(index: number, patch: Partial<Competency>) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  function addRow() {
    setRows((prev) => [...prev, { id: `c${Date.now()}`, label: '', maxValue: 1 }])
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSave() {
    setError('')
    setSaving(true)
    try {
      const saved = await updateCompetencyScheme({ data: { scheme: rows } })
      onSaved(saved)
      showToast('Esquema de competências salvo.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar o esquema.')
    } finally {
      setSaving(false)
    }
  }

  const total = rows.reduce((sum, r) => sum + (Number(r.maxValue) || 0), 0)

  return (
    <div className="panel-card plain">
      <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 0 }}>
        Edite o nome e o valor máximo de cada competência. A nota final da redação é a soma de todas.
      </p>
      <div style={{ display: 'grid', gap: 8 }}>
        {rows.map((row, index) => (
          <div key={row.id} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              value={row.label}
              onChange={(e) => updateRow(index, { label: e.target.value })}
              placeholder="Nome da competência"
              style={{ flex: 1, minWidth: 200 }}
            />
            <input
              type="number"
              min={0.25}
              step={0.25}
              value={row.maxValue}
              onChange={(e) => updateRow(index, { maxValue: Number(e.target.value) })}
              style={{ width: 80 }}
            />
            <button onClick={() => removeRow(index)} className="btn btn-danger btn-sm">Remover</button>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, flexWrap: 'wrap', gap: 8 }}>
        <button onClick={addRow} className="btn btn-ghost btn-sm" style={{ borderStyle: 'dashed' }}>+ Adicionar competência</button>
        <span style={{ fontSize: 13, color: 'var(--muted)' }}>Nota bruta máxima: <b style={{ color: 'var(--navy)' }}>{total}</b> · Nota final máxima (peso 4): <b style={{ color: 'var(--navy)' }}>{total * 4}</b></span>
      </div>
      <button onClick={handleSave} disabled={saving} className="btn btn-primary" style={{ marginTop: 12 }}>
        {saving ? 'Salvando...' : 'Salvar esquema de competências'}
      </button>
      {error && <p className="form-error" style={{ fontSize: 13 }}>{error}</p>}
    </div>
  )
}

function CorrectionForm({ submission, scheme, onSaved }: { submission: SubmissionMeta; scheme: Competency[]; onSaved: () => void }) {
  const showToast = useToast()
  const initialScores = scheme.map((competency) => {
    const existing = submission.competencyScores?.find((s) => s.id === competency.id)
    return { ...competency, value: existing?.value ?? 0 }
  })
  const [scores, setScores] = useState<CompetencyScore[]>(initialScores)
  const [feedback, setFeedback] = useState(submission.feedback ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [openLevelsId, setOpenLevelsId] = useState<string | null>(null)

  function updateScore(id: string, value: number) {
    setScores((prev) => prev.map((s) => (s.id === id ? { ...s, value } : s)))
  }

  const rawTotal = Math.round(scores.reduce((sum, s) => sum + (Number(s.value) || 0), 0) * 100) / 100
  const finalGrade = Math.round(rawTotal * 4 * 100) / 100

  async function handleSave() {
    setError('')
    setSaving(true)
    try {
      await correctRedacao({ data: { id: submission.id, scores, feedback } })
      onSaved()
      showToast('Correção salva.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar a correção.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="panel-card plain" style={{ marginTop: 12, display: 'grid', gap: 10 }}>
      {scores.map((score) => (
        <div key={score.id}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)', flex: 1, minWidth: 180, textTransform: 'none' }}>{score.label} <span style={{ color: '#9ca3af', fontWeight: 400 }}>(0–{score.maxValue})</span></label>
            <input
              type="number"
              min={0}
              max={score.maxValue}
              step={0.25}
              value={score.value}
              onChange={(e) => updateScore(score.id, Number(e.target.value))}
              style={{ width: 90 }}
            />
            {score.levels && score.levels.length > 0 && (
              <button
                type="button"
                onClick={() => setOpenLevelsId(openLevelsId === score.id ? null : score.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--purple)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, padding: 0 }}
              >
                Ver níveis {openLevelsId === score.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            )}
          </div>
          {openLevelsId === score.id && score.levels && (
            <div style={{ marginTop: 6, marginLeft: 4, borderLeft: '2px solid var(--line)', paddingLeft: 10 }}>
              {score.levels.map((level, index) => (
                <div key={index} style={{ display: 'flex', gap: 8, fontSize: 12, color: '#4b5563', padding: '3px 0' }}>
                  <b style={{ color: 'var(--purple)', minWidth: 62 }}>{level.range}</b>
                  <span>{level.description}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
      <div style={{ fontWeight: 800, color: 'var(--navy)' }}>Nota bruta: {rawTotal}/10 · Nota final (peso 4): {finalGrade}/40</div>
      <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Comentário para o aluno" rows={3} />
      <button onClick={handleSave} disabled={saving} className="btn btn-primary" style={{ width: 'fit-content' }}>
        {saving ? 'Salvando...' : 'Salvar correção'}
      </button>
      {error && <p className="form-error" style={{ margin: 0 }}>{error}</p>}
    </div>
  )
}

function RedacoesAdminPage() {
  const [submissions, setSubmissions] = useState<SubmissionMeta[]>([])
  const [scheme, setScheme] = useState<Competency[]>([])
  const [loading, setLoading] = useState(true)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [showSchemeEditor, setShowSchemeEditor] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const [subs, currentScheme] = await Promise.all([listAllRedacoes(), getCompetencyScheme()])
      setSubmissions(subs)
      setScheme(currentScheme)
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
      <div key={submission.id} className="panel-card plain" style={{ marginTop: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ minWidth: 0, wordBreak: 'break-word' }}>
            <b style={{ color: 'var(--navy)' }}>{submission.title}</b>
            <div style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>
              {submission.studentName} · {submission.studentEmail}
            </div>
            <div className="list-meta">
              Enviada em {new Date(submission.submittedAt).toLocaleDateString('pt-BR')}
            </div>
          </div>
          {submission.deliveryMethod === 'presencial' ? (
            <span className="badge badge-brand" style={{ padding: '8px 12px' }}>
              <HandHelping size={14} /> Entregue presencialmente
            </span>
          ) : (
            <button onClick={() => handleDownload(submission.id)} disabled={downloadingId === submission.id} className="btn btn-ghost btn-sm">
              <Download size={14} /> {downloadingId === submission.id ? 'Abrindo...' : 'Ver arquivo'}
            </button>
          )}
        </div>

        {submission.status === 'corrigida' && (
          <div style={{ marginTop: 10, color: '#15803d', fontSize: 13, fontWeight: 700 }}>Nota: {submission.grade}/40</div>
        )}

        <button
          onClick={() => setOpenId(openId === submission.id ? null : submission.id)}
          style={{ marginTop: 10, color: 'var(--purple)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, padding: 0 }}
        >
          {openId === submission.id ? 'Fechar' : submission.status === 'corrigida' ? 'Editar correção' : 'Corrigir'}
        </button>

        {openId === submission.id && (
          <CorrectionForm submission={submission} scheme={scheme} onSaved={() => { setOpenId(null); void load() }} />
        )}
      </div>
    )
  }

  return (
    <main className="panel">
      <Link to="/admin" className="panel-back">← Voltar ao painel admin</Link>
      <h1>Correção de redações</h1>
      <p className="panel-subtitle">Veja as redações enviadas pelos alunos e envie a nota (critérios da banca Econ Rio) e o comentário.</p>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
        <Link to="/temas-redacao-admin" className="btn btn-ghost btn-sm" style={{ background: 'var(--lilac-tint)' }}>
          <PenLine size={15} /> Temas de redação
        </Link>
        <button onClick={() => setShowSchemeEditor((v) => !v)} className="btn btn-ghost btn-sm">
          <Settings size={15} /> {showSchemeEditor ? 'Fechar edição de competências' : 'Editar valores das competências'}
        </button>
      </div>

      {showSchemeEditor && !loading && (
        <SchemeEditor scheme={scheme} onSaved={(saved) => { setScheme(saved); setShowSchemeEditor(false) }} />
      )}

      {loading && <p className="panel-subtitle">Carregando...</p>}

      <section style={{ marginTop: 24 }}>
        <h2 className="panel-section-title" style={{ color: '#a16207' }}>Aguardando correção ({pendentes.length})</h2>
        <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
          {pendentes.map(renderCard)}
          {!loading && pendentes.length === 0 && <p className="empty-state">Nenhuma redação pendente.</p>}
        </div>
      </section>

      <section>
        <h2 className="panel-section-title" style={{ color: '#15803d' }}>Já corrigidas ({corrigidas.length})</h2>
        <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
          {corrigidas.map(renderCard)}
          {!loading && corrigidas.length === 0 && <p className="empty-state">Nenhuma redação corrigida ainda.</p>}
        </div>
      </section>
    </main>
  )
}
