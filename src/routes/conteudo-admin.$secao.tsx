import { createFileRoute, redirect } from '@tanstack/react-router'
import { Upload } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { readLocalUser } from '@/lib/identity-context'
import { getServerUser } from '@/lib/auth'
import { userHasRole } from '@/lib/roles'
import {
  addContentItem, CONTENT_SECTIONS, CONTENT_TEXT_COLORS, DEFAULT_DESCRIPTION_COLOR, DEFAULT_TITLE_COLOR,
  deleteContentItem, DICA_CATEGORIES, GABARITO_ORIGINS, isContentSection, listContentItems,
  resolveDicaCategory, resolveGabaritoOrigin, textColorValue,
  type ContentItemMeta, type ContentSection, type ContentTextColor, type DicaCategory,
  type GabaritoOrigin,
} from '@/lib/content-library'
import { useToast } from '@/lib/toast'
import { erroDeTamanhoDeUploadGrande } from '@/lib/upload-limits'
import { enviarArquivo } from '@/lib/enviar-arquivo'
import { VoltarAoPainel } from '@/components/VoltarAoPainel'

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

/** Paleta fechada: a professora clica na bolinha em vez de digitar um código de cor. */
function ColorPicker({ label, value, onChange }: {
  label: string
  value: ContentTextColor
  onChange: (color: ContentTextColor) => void
}) {
  return (
    <div className="field">
      <label>{label}</label>
      <div className="color-swatches">
        {(Object.keys(CONTENT_TEXT_COLORS) as ContentTextColor[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className={`color-swatch${value === key ? ' is-selected' : ''}`}
            style={{ background: CONTENT_TEXT_COLORS[key].value }}
            aria-label={CONTENT_TEXT_COLORS[key].label}
            aria-pressed={value === key}
            title={CONTENT_TEXT_COLORS[key].label}
          />
        ))}
      </div>
    </div>
  )
}

function ConteudoAdminPage() {
  const showToast = useToast()
  const { secao } = Route.useParams()
  const section = secao as ContentSection
  const sectionLabel = CONTENT_SECTIONS[section]
  const isDicas = section === 'dicas'
  const isGabaritos = section === 'gabaritos'

  const [items, setItems] = useState<ContentItemMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<DicaCategory>('gramatica')
  const [origin, setOrigin] = useState<GabaritoOrigin>('simuladinho')
  const [titleColor, setTitleColor] = useState<ContentTextColor>(DEFAULT_TITLE_COLOR)
  const [descriptionColor, setDescriptionColor] = useState<ContentTextColor>(DEFAULT_DESCRIPTION_COLOR)
  const [file, setFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [progresso, setProgresso] = useState(0)

  async function load() {
    setLoading(true)
    try {
      const data = await listContentItems({ data: { section } })
      setItems(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section])

  // Mesma conta que o servidor faz: itens antigos (sem categoria) não entram na numeração.
  const nextLabel = useMemo(() => {
    const used = items.filter((item) => item.category === category).length
    return `Dica ${used + 1} · ${DICA_CATEGORIES[category]}`
  }, [items, category])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    if (!isDicas && !title.trim()) { setError('Dê um título para o arquivo.'); return }
    if (!file) { setError('Escolha um arquivo PDF para enviar.'); return }
    const tamanhoInvalido = erroDeTamanhoDeUploadGrande(file)
    if (tamanhoInvalido) { setError(tamanhoInvalido); return }

    setSaving(true)
    setProgresso(0)
    try {
      // Arquivo grande sobe em pedaços; o progresso é o que evita a sensação de
      // travamento numa espera que agora pode passar de meio minuto.
      const enviado = await enviarArquivo(file, setProgresso)
      await addContentItem({
        data: {
          section,
          title: isDicas ? '' : title,
          description,
          fileName: file.name,
          ...(enviado.modo === 'direto'
            ? { fileDataUrl: enviado.fileDataUrl }
            : { upload: { uploadId: enviado.uploadId, mime: enviado.mime } }),
          ...(isDicas ? { category } : {}),
          ...(isGabaritos ? { origin } : {}),
          titleColor,
          descriptionColor,
        },
      })
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
      setProgresso(0)
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
      <VoltarAoPainel />
      <h1>{sectionLabel} · Arquivos em PDF</h1>
      <p className="panel-subtitle">Envie os PDFs que vão aparecer para os alunos na seção "{sectionLabel}".</p>

      {/* Sem o respiro entre os campos, cada rótulo cola no campo de cima. */}
      <form onSubmit={handleSubmit} className="panel-card" style={{ maxWidth: 480 }}>
        {isDicas && (
          <div className="field">
            <label>Tipo da dica</label>
            <div className="tab-switch">
              {(Object.keys(DICA_CATEGORIES) as DicaCategory[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCategory(key)}
                  className={`tab-switch-btn${category === key ? ' is-active' : ''}`}
                  aria-pressed={category === key}
                >
                  {DICA_CATEGORIES[key]}
                </button>
              ))}
            </div>
            <p className="field-hint">O nome é automático: este arquivo vai entrar como <b>{nextLabel}</b>.</p>
          </div>
        )}

        {isGabaritos && (
          <div className="field">
            <label>Tipo do simulado</label>
            <div className="tab-switch">
              {(Object.keys(GABARITO_ORIGINS) as GabaritoOrigin[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setOrigin(key)}
                  className={`tab-switch-btn${origin === key ? ' is-active' : ''}`}
                  aria-pressed={origin === key}
                >
                  {GABARITO_ORIGINS[key]}
                </button>
              ))}
            </div>
            <p className="field-hint">O aluno acha este arquivo na aba <b>{GABARITO_ORIGINS[origin]}</b> da página de Gabarito.</p>
          </div>
        )}

        {!isDicas && (
          <div className="field">
            <label>Título</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
        )}

        <div className="field">
          <label>Descrição</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
        </div>

        <ColorPicker label="Cor do título" value={titleColor} onChange={setTitleColor} />
        <ColorPicker label="Cor da descrição" value={descriptionColor} onChange={setDescriptionColor} />

        <div className="field">
          <label>Como o aluno vai ver</label>
          <div className="content-preview">
            {/* Em Dicas o nome é automático; nas outras seções é o título digitado aqui em cima. */}
            <b style={{ color: textColorValue(titleColor, DEFAULT_TITLE_COLOR), fontSize: 14 }}>
              {isDicas ? nextLabel : (title.trim() || 'O título que você escrever aparece aqui.')}
            </b>
            <div style={{ color: textColorValue(descriptionColor, DEFAULT_DESCRIPTION_COLOR), fontSize: 13, marginTop: 4 }}>
              {description.trim() || 'A descrição que você escrever aparece aqui.'}
            </div>
          </div>
        </div>

        <div className="field">
          <label>Arquivo (PDF)</label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            onChange={(e) => {
              // Confere o tamanho já na escolha: acima do teto a requisição morre
              // na borda da Netlify e o formulário ficaria preso em "Enviando...".
              const escolhido = e.target.files?.[0] ?? null
              const problema = escolhido ? erroDeTamanhoDeUploadGrande(escolhido) : null
              setError(problema ?? '')
              setFile(problema ? null : escolhido)
              if (problema) e.target.value = ''
            }}
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
          {saving ? (progresso > 0 && progresso < 1 ? `Enviando... ${Math.round(progresso * 100)}%` : 'Enviando...') : 'Adicionar arquivo'}
        </button>
        {error && <p className="form-error">{error}</p>}
      </form>

      <section>
        <h2 className="panel-section-title">Arquivos enviados</h2>
        {loading && <p className="panel-subtitle">Carregando...</p>}
        {/* Dicas e Gabaritos são divididos, então a lista vem agrupada: a professora
            confere de que lado cada arquivo caiu sem ter que abrir a tela do aluno.
            As outras seções não têm divisão e seguem em lista corrida. */}
        {isDicas && (Object.keys(DICA_CATEGORIES) as DicaCategory[]).map((key) => {
          const rows = items.filter((item) => resolveDicaCategory(item) === key)
          return (
            <div key={key} style={{ marginTop: 16 }}>
              <h3 className="panel-section-title" style={{ margin: '0 0 8px', fontSize: 15 }}>{DICA_CATEGORIES[key]}</h3>
              <div style={{ display: 'grid', gap: 10 }}>
                {rows.map((item) => (
                  <ItemRow key={item.id} item={item} onDelete={handleDelete} />
                ))}
                {!loading && rows.length === 0 && (
                  <p className="empty-state">Nenhuma dica de {DICA_CATEGORIES[key].toLowerCase()} ainda.</p>
                )}
              </div>
            </div>
          )
        })}

        {isGabaritos && (Object.keys(GABARITO_ORIGINS) as GabaritoOrigin[]).map((key) => {
          const rows = items.filter((item) => resolveGabaritoOrigin(item) === key)
          return (
            <div key={key} style={{ marginTop: 16 }}>
              <h3 className="panel-section-title" style={{ margin: '0 0 8px', fontSize: 15 }}>{GABARITO_ORIGINS[key]}</h3>
              <div style={{ display: 'grid', gap: 10 }}>
                {rows.map((item) => (
                  <ItemRow key={item.id} item={item} onDelete={handleDelete} />
                ))}
                {!loading && rows.length === 0 && (
                  <p className="empty-state">Nenhum gabarito de {GABARITO_ORIGINS[key].toLowerCase()} ainda.</p>
                )}
              </div>
            </div>
          )
        })}

        {!isDicas && !isGabaritos && (
          <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
            {items.map((item) => (
              <ItemRow key={item.id} item={item} onDelete={handleDelete} />
            ))}
            {!loading && items.length === 0 && <p className="empty-state">Nenhum arquivo enviado ainda.</p>}
          </div>
        )}
      </section>
    </main>
  )
}

function ItemRow({ item, onDelete }: { item: ContentItemMeta, onDelete: (id: string) => void }) {
  return (
    <div className="list-row">
      <div style={{ minWidth: 0, wordBreak: 'break-word' }}>
        <b style={{ color: textColorValue(item.titleColor, DEFAULT_TITLE_COLOR) }}>{item.label}</b>
        {item.description && (
          <div style={{ color: textColorValue(item.descriptionColor, DEFAULT_DESCRIPTION_COLOR), fontSize: 13, marginTop: 4 }}>
            {item.description}
          </div>
        )}
        <div className="list-meta" style={{ marginTop: 4 }}>{item.fileName}</div>
      </div>
      <button onClick={() => onDelete(item.id)} className="btn btn-danger btn-sm">Excluir</button>
    </div>
  )
}
