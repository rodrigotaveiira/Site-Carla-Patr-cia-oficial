import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { CalendarDays, Check, Download, HandHelping, PenLine, Upload } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { readLocalUser } from '@/lib/identity-context'
import { getServerUser } from '@/lib/auth'
import { userHasRole, isStaff } from '@/lib/roles'
import { getRedacaoFile, listMyRedacoes, submitRedacao, submitRedacaoPresencial, type RedacaoSubmission } from '@/lib/redacoes'
import { listTemas, type TemaRedacao } from '@/lib/temas-redacao'

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

  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px', fontFamily: 'sans-serif' }}>
      <Link to="/dashboard" style={{ color: '#6d28d9', fontWeight: 700, textDecoration: 'none' }}>← Voltar ao dashboard</Link>
      <h1 style={{ fontFamily: 'var(--serif, serif)', color: '#0f2342', marginTop: 16 }}>Redações</h1>
      <p style={{ color: '#6b7280' }}>Envie uma foto ou arquivo da sua redação para correção da professora.</p>

      {temas.length > 0 && (
        <section style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: 16, color: '#0f2342', display: 'flex', alignItems: 'center', gap: 8 }}>
            <PenLine size={17} color="#6d28d9" /> Tema proposto
          </h2>
          <div style={{ marginTop: 10, background: '#f9f8fd', border: '1px solid #ece8f7', borderRadius: 10, padding: 20 }}>
            <b style={{ color: '#0f2342', fontSize: 16 }}>{temas[0].title}</b>
            {temas[0].proposta && <p style={{ color: '#4b5563', fontSize: 14, marginTop: 10, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{temas[0].proposta}</p>}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, flexWrap: 'wrap', gap: 10 }}>
              {temas[0].prazo ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#a16207', fontSize: 13, fontWeight: 600 }}>
                  <CalendarDays size={14} /> Entrega até {new Date(`${temas[0].prazo}T00:00:00`).toLocaleDateString('pt-BR')}
                </span>
              ) : <span />}
              <button
                type="button"
                onClick={() => setTitle(temas[0].title)}
                style={{ color: '#6d28d9', background: 'none', border: '1px solid #c9befd', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}
              >
                Usar este tema no envio
              </button>
            </div>
          </div>
          {temas.length > 1 && (
            <details style={{ marginTop: 10 }}>
              <summary style={{ color: '#6d28d9', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Ver temas anteriores</summary>
              <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
                {temas.slice(1).map((tema) => (
                  <div key={tema.id} style={{ background: '#fff', border: '1px solid #e0dcf0', borderRadius: 8, padding: 12 }}>
                    <b style={{ color: '#0f2342', fontSize: 14 }}>{tema.title}</b>
                    <button
                      type="button"
                      onClick={() => setTitle(tema.title)}
                      style={{ display: 'block', marginTop: 6, color: '#6d28d9', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 12, padding: 0 }}
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
              borderRadius: '8px 8px 0 0', border: '1px solid #ece8f7', borderBottom: deliveryMode === 'upload' ? '2px solid #6d28d9' : '1px solid #ece8f7',
              background: deliveryMode === 'upload' ? '#f9f8fd' : '#fff', color: deliveryMode === 'upload' ? '#6d28d9' : '#6b7280',
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
              borderRadius: '8px 8px 0 0', border: '1px solid #ece8f7', borderBottom: deliveryMode === 'presencial' ? '2px solid #6d28d9' : '1px solid #ece8f7',
              background: deliveryMode === 'presencial' ? '#f9f8fd' : '#fff', color: deliveryMode === 'presencial' ? '#6d28d9' : '#6b7280',
              fontWeight: 700, fontSize: 13, cursor: 'pointer',
            }}
          >
            <HandHelping size={14} /> Entreguei presencialmente
          </button>
        </div>

        {deliveryMode === 'upload' ? (
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12, background: '#f9f8fd', border: '1px solid #ece8f7', borderRadius: '0 0 10px 10px', padding: 20 }}>
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
        ) : (
          <div style={{ display: 'grid', gap: 12, background: '#f9f8fd', border: '1px solid #ece8f7', borderRadius: '0 0 10px 10px', padding: 20 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 4, color: '#0f2342', fontWeight: 600 }}>Tema (opcional)</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Inteligência artificial e sociedade" style={{ width: '100%', padding: 10, border: '1px solid #e0dcf0', borderRadius: 8, boxSizing: 'border-box' }} />
            </div>
            <p style={{ color: '#6b7280', fontSize: 13, margin: 0 }}>
              Use esta opção só se você já entregou a folha da redação em mãos para a professora. Ela vai entrar na fila de correção normalmente, sem arquivo anexado.
            </p>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: '#0f2342', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={presencialConfirmed}
                onChange={(e) => setPresencialConfirmed(e.target.checked)}
                style={{ marginTop: 2 }}
              />
              Confirmo que entreguei minha redação impressa, em mãos, para a professora.
            </label>
            <button
              type="button"
              onClick={handlePresencialConfirm}
              disabled={!presencialConfirmed || presencialSaving}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, width: 'fit-content', border: 'none', borderRadius: 8, padding: '11px 20px', fontWeight: 700,
                color: '#fff', background: presencialConfirmed ? '#6d28d9' : '#c9befd',
                cursor: presencialConfirmed ? 'pointer' : 'not-allowed',
              }}
            >
              <Check size={16} /> {presencialSaving ? 'Confirmando...' : 'Confirmar entrega presencial'}
            </button>
            {presencialError && <p style={{ color: '#dc2626', margin: 0 }}>{presencialError}</p>}
          </div>
        )}
      </div>

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
                    {submission.deliveryMethod === 'presencial' && (
                      <span style={{ marginLeft: 8, display: 'inline-flex', alignItems: 'center', gap: 4, color: '#6d28d9', fontWeight: 700 }}>
                        <HandHelping size={12} /> Entregue presencialmente
                      </span>
                    )}
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

              {submission.deliveryMethod !== 'presencial' && (
                <button
                  onClick={() => handleDownload(submission.id)}
                  disabled={downloadingId === submission.id}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, color: '#6d28d9', background: 'none', border: '1px solid #e0dcf0', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontWeight: 600 }}
                >
                  <Download size={14} /> {downloadingId === submission.id ? 'Abrindo...' : 'Ver arquivo enviado'}
                </button>
              )}
            </div>
          ))}
          {!loading && submissions.length === 0 && <p style={{ color: '#6b7280' }}>Você ainda não enviou nenhuma redação.</p>}
        </div>
      </section>
    </main>
  )
}
