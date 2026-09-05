import { createFileRoute, redirect } from '@tanstack/react-router'
import { CalendarDays, Check, Download, HandHelping, PenLine, Upload } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { readLocalUser } from '@/lib/identity-context'
import { getServerUser } from '@/lib/auth'
import { userHasRole, isStaff } from '@/lib/roles'
import { getRedacaoFile, listMyRedacoes, submitRedacao, submitRedacaoPresencial, type RedacaoSubmission } from '@/lib/redacoes'
import { listTemas, type TemaRedacao } from '@/lib/temas-redacao'
import { EmptyState } from '@/components/EmptyState'
import { ListSkeleton } from '@/components/ListSkeleton'

export const Route = createFileRoute('/_app/redacoes')({
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

type SubmissionMeta = Omit<RedacaoSubmission, 'fileDataUrl' | 'correctedFileDataUrl'>

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
  const [downloadingCorrectionId, setDownloadingCorrectionId] = useState<string | null>(null)
  const [temas, setTemas] = useState<TemaRedacao[]>([])
  const [deliveryMode, setDeliveryMode] = useState<'upload' | 'presencial'>('upload')
  const [presencialConfirmed, setPresencialConfirmed] = useState(false)
  const [presencialSaving, setPresencialSaving] = useState(false)
  const [presencialError, setPresencialError] = useState('')

  useEffect(() => {
    listTemas().then(setTemas).catch(() => { /* seção de temas some se der erro */ })
  }, [])

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

  async function handlePresencialConfirm() {
    setPresencialError('')
    if (!presencialConfirmed) return
    setPresencialSaving(true)
    try {
      await submitRedacaoPresencial({ data: { title } })
      setTitle('')
      setPresencialConfirmed(false)
      await load()
    } catch (err) {
      setPresencialError(err instanceof Error ? err.message : 'Não foi possível confirmar a entrega.')
    } finally {
      setPresencialSaving(false)
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

  async function handleDownloadCorrection(id: string) {
    setDownloadingCorrectionId(id)
    try {
      const { fileName, fileDataUrl } = await getRedacaoFile({ data: { id, kind: 'correction' } })
      const link = document.createElement('a')
      link.download = fileName
      link.href = fileDataUrl
      link.click()
    } finally {
      setDownloadingCorrectionId(null)
    }
  }

  return (
    <div className="panel">
      <h1>Redações</h1>
      <p className="panel-subtitle">Envie uma foto ou arquivo da sua redação para ser corrigida pela professora.</p>

      {temas.length > 0 && (
        <section>
          <h2 className="panel-section-title" style={{ fontSize: 16 }}>
            <PenLine size={17} color="var(--purple)" /> Tema proposto
          </h2>
          <div className="panel-card plain">
            <b style={{ color: 'var(--navy)', fontSize: 16 }}>{temas[0].title}</b>
            {temas[0].proposta && <p style={{ color: '#4b5563', fontSize: 14, marginTop: 10, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{temas[0].proposta}</p>}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, flexWrap: 'wrap', gap: 10 }}>
              {temas[0].prazo ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#a16207', fontSize: 13, fontWeight: 600 }}>
                  <CalendarDays size={14} /> Entrega até {new Date(`${temas[0].prazo}T00:00:00`).toLocaleDateString('pt-BR')}
                </span>
              ) : <span />}
              <button type="button" onClick={() => setTitle(temas[0].title)} className="btn btn-ghost btn-sm">
                Usar este tema no envio
              </button>
            </div>
          </div>
          {temas.length > 1 && (
            <details style={{ marginTop: 10 }}>
              <summary style={{ color: 'var(--purple)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Ver temas anteriores</summary>
              <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
                {temas.slice(1).map((tema) => (
                  <div key={tema.id} className="list-row" style={{ display: 'block' }}>
                    <b style={{ color: 'var(--navy)', fontSize: 14 }}>{tema.title}</b>
                    <button
                      type="button"
                      onClick={() => setTitle(tema.title)}
                      style={{ display: 'block', marginTop: 6, color: 'var(--purple)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 12, padding: 0 }}
                    >
                      Usar este tema no envio
                    </button>
                  </div>
                ))}
              </div>
            </details>
          )}
        </section>
      )}

      <div style={{ marginTop: 24, maxWidth: 480 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={() => setDeliveryMode('upload')}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 14px',
              borderRadius: '8px 8px 0 0', border: '1px solid #ece8f7', borderBottom: deliveryMode === 'upload' ? '2px solid var(--purple)' : '1px solid #ece8f7',
              background: deliveryMode === 'upload' ? 'var(--lilac-tint)' : '#fff', color: deliveryMode === 'upload' ? 'var(--purple)' : 'var(--muted)',
              fontWeight: 700, fontSize: 13, cursor: 'pointer',
            }}
          >
            <Upload size={14} /> Enviar foto ou arquivo
          </button>
          <button
            type="button"
            onClick={() => setDeliveryMode('presencial')}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 14px',
              borderRadius: '8px 8px 0 0', border: '1px solid #ece8f7', borderBottom: deliveryMode === 'presencial' ? '2px solid var(--purple)' : '1px solid #ece8f7',
              background: deliveryMode === 'presencial' ? 'var(--lilac-tint)' : '#fff', color: deliveryMode === 'presencial' ? 'var(--purple)' : 'var(--muted)',
              fontWeight: 700, fontSize: 13, cursor: 'pointer',
            }}
          >
            <HandHelping size={14} /> Entreguei presencialmente
          </button>
        </div>

        {deliveryMode === 'upload' ? (
          <form onSubmit={handleSubmit} className="panel-card" style={{ display: 'grid', gap: 12, borderRadius: '0 0 10px 10px', marginTop: 0 }}>
            <div className="field">
              <label>Tema (opcional)</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Inteligência artificial e sociedade" />
            </div>
            <div className="field">
              <label>Foto ou arquivo da redação</label>
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
                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', boxSizing: 'border-box', padding: '14px 16px', background: '#fff', border: '2px dashed #c9befd', borderRadius: 8, color: 'var(--purple)', fontWeight: 700, cursor: 'pointer' }}
              >
                <Upload size={18} /> {file ? file.name : 'Toque aqui para escolher a foto ou arquivo'}
              </button>
            </div>
            <button type="submit" disabled={saving} className="btn btn-primary" style={{ width: 'fit-content' }}>
              <Upload size={16} /> {saving ? 'Enviando...' : 'Enviar redação'}
            </button>
            {error && <p className="form-error" style={{ margin: 0 }}>{error}</p>}
          </form>
        ) : (
          <div className="panel-card" style={{ display: 'grid', gap: 12, borderRadius: '0 0 10px 10px', marginTop: 0 }}>
            <div className="field">
              <label>Tema (opcional)</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Inteligência artificial e sociedade" />
            </div>
            <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>
              Use esta opção só se você já entregou a folha da redação em mãos para a professora. Ela vai entrar na fila de correção normalmente, sem arquivo anexado.
            </p>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: 'var(--navy)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={presencialConfirmed}
                onChange={(e) => setPresencialConfirmed(e.target.checked)}
                style={{ marginTop: 2, width: 'auto' }}
              />
              Confirmo que entreguei minha redação impressa, em mãos, para a professora.
            </label>
            <button
              type="button"
              onClick={handlePresencialConfirm}
              disabled={!presencialConfirmed || presencialSaving}
              className="btn btn-primary"
              style={{ width: 'fit-content', background: presencialConfirmed ? undefined : '#c9befd' }}
            >
              <Check size={16} /> {presencialSaving ? 'Confirmando...' : 'Confirmar entrega presencial'}
            </button>
            {presencialError && <p className="form-error" style={{ margin: 0 }}>{presencialError}</p>}
          </div>
        )}
      </div>

      {(() => {
        const corrected = submissions.filter((s) => s.status === 'corrigida' && s.grade !== null)
        if (corrected.length < 2) return null
        const chronological = [...corrected].sort((a, b) => (a.correctedAt ?? '').localeCompare(b.correctedAt ?? ''))
        const maxGrade = Math.max(...chronological.map((s) => s.grade ?? 0), 1)
        return (
          <section>
            <h2 className="panel-section-title">Evolução das suas notas</h2>
            <p className="panel-section-hint">Suas últimas correções, na ordem em que foram feitas.</p>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, marginTop: 16, height: 140, padding: '0 4px', overflowX: 'auto' }}>
              {chronological.map((submission) => (
                <div key={submission.id} title={submission.title} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 44 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy)' }}>{submission.grade}</span>
                  <div style={{ width: 24, height: `${Math.max(6, ((submission.grade ?? 0) / maxGrade) * 90)}px`, background: 'var(--purple)', borderRadius: 4 }} />
                  <span style={{ fontSize: 10, color: '#9ca3af' }}>{new Date(submission.correctedAt ?? submission.submittedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
                </div>
              ))}
            </div>
          </section>
        )
      })()}

      <section>
        <h2 className="panel-section-title">Suas redações enviadas</h2>
        {loading && <ListSkeleton rows={3} />}
        <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
          {submissions.map((submission) => (
            <div key={submission.id} className="panel-card plain" style={{ marginTop: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ minWidth: 0, wordBreak: 'break-word' }}>
                  <b style={{ color: 'var(--navy)' }}>{submission.title}</b>
                  <div style={{ color: '#9ca3af', fontSize: 12, marginTop: 4 }}>
                    Enviada em {new Date(submission.submittedAt).toLocaleDateString('pt-BR')}
                    {submission.deliveryMethod === 'presencial' && (
                      <span style={{ marginLeft: 8, display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--purple)', fontWeight: 700 }}>
                        <HandHelping size={12} /> Entregue presencialmente
                      </span>
                    )}
                  </div>
                </div>
                <span className={submission.status === 'corrigida' ? 'badge badge-success' : 'badge badge-warning'}>
                  {submission.status === 'corrigida' ? 'Corrigida' : 'Aguardando correção'}
                </span>
              </div>

              {submission.status === 'corrigida' && (
                <div style={{ marginTop: 12, background: 'var(--lilac-tint)', borderRadius: 8, padding: 12 }}>
                  <div style={{ fontWeight: 800, color: 'var(--purple)', fontSize: 20 }}>{submission.grade}/40</div>
                  {submission.competencyScores && submission.competencyScores.length > 0 && (
                    <div style={{ display: 'grid', gap: 6, marginTop: 10 }}>
                      {submission.competencyScores.map((score) => (
                        <div key={score.id}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#4b5563' }}>
                            <span>{score.label}</span>
                            <span>{score.value} / {score.maxValue}</span>
                          </div>
                          <div style={{ height: 5, background: '#e5e0f5', borderRadius: 4, overflow: 'hidden', marginTop: 3 }}>
                            <div style={{ width: `${(score.value / score.maxValue) * 100}%`, height: '100%', background: 'var(--purple)' }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {submission.feedback && <p style={{ color: '#4b5563', fontSize: 14, margin: '10px 0 0' }}>{submission.feedback}</p>}
                  {submission.correctedFileName && (
                    <button
                      onClick={() => handleDownloadCorrection(submission.id)}
                      disabled={downloadingCorrectionId === submission.id}
                      className="btn btn-ghost btn-sm"
                      style={{ marginTop: 10 }}
                    >
                      <Download size={14} /> {downloadingCorrectionId === submission.id ? 'Abrindo...' : 'Ver foto da correção'}
                    </button>
                  )}
                </div>
              )}

              {submission.deliveryMethod !== 'presencial' && (
                <button onClick={() => handleDownload(submission.id)} disabled={downloadingId === submission.id} className="btn btn-ghost btn-sm" style={{ marginTop: 12 }}>
                  <Download size={14} /> {downloadingId === submission.id ? 'Abrindo...' : 'Ver arquivo enviado'}
                </button>
              )}
            </div>
          ))}
          {!loading && submissions.length === 0 && (
            <EmptyState icon={PenLine} title="Você ainda não enviou nenhuma redação" description="Escolha um tema acima e envie seu texto — assim que a professora corrigir, a nota e o comentário aparecem aqui." />
          )}
        </div>
      </section>
    </div>
  )
}
