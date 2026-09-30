import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Bold, Highlighter, Italic, List, ListOrdered, RemoveFormatting, Underline } from 'lucide-react'
import { normalizePastedHtml, plainTextToHtml } from '@/lib/rich-text'

// Editor de texto rico da devolutiva. É um contentEditable "não controlado":
// o HTML inicial é aplicado uma vez e cada edição é repassada por onChange.
// Ao colar, o HTML do Google Docs é normalizado (ver normalizePastedHtml) pra
// manter negrito, itálico, sublinhado, listas, cores e o marca-texto.
export function RichTextEditor({
  initialHtml,
  onChange,
  placeholder,
  ariaLabel,
}: {
  initialHtml: string
  onChange: (html: string) => void
  placeholder?: string
  ariaLabel?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [empty, setEmpty] = useState(!initialHtml)

  useEffect(() => {
    if (ref.current) ref.current.innerHTML = initialHtml
    // Só no mount: reescrever o innerHTML a cada tecla perderia o cursor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function emit() {
    const el = ref.current
    if (!el) return
    const isEmpty = !el.textContent?.trim() && !el.querySelector('li')
    setEmpty(isEmpty)
    onChange(isEmpty ? '' : el.innerHTML)
  }

  function run(command: string, value?: string) {
    ref.current?.focus()
    document.execCommand(command, false, value)
    emit()
  }

  function toggleHighlight() {
    const current = String(document.queryCommandValue('hiliteColor') || document.queryCommandValue('backColor') || '')
    const highlighted = current && !/^(transparent|rgba\(0, 0, 0, 0\)|rgb\(255, 255, 255\)|#ffffff)$/i.test(current)
    run('hiliteColor', highlighted ? 'transparent' : '#ffff00')
  }

  function handlePaste(event: React.ClipboardEvent<HTMLDivElement>) {
    const html = event.clipboardData.getData('text/html')
    const text = event.clipboardData.getData('text/plain')
    event.preventDefault()
    if (html) document.execCommand('insertHTML', false, normalizePastedHtml(html))
    else if (text) document.execCommand('insertHTML', false, plainTextToHtml(text))
    emit()
  }

  const tools = [
    { label: 'Negrito', icon: Bold, action: () => run('bold') },
    { label: 'Itálico', icon: Italic, action: () => run('italic') },
    { label: 'Sublinhado', icon: Underline, action: () => run('underline') },
    { label: 'Marca-texto', icon: Highlighter, action: toggleHighlight },
    { label: 'Lista', icon: List, action: () => run('insertUnorderedList') },
    { label: 'Lista numerada', icon: ListOrdered, action: () => run('insertOrderedList') },
    { label: 'Limpar formatação', icon: RemoveFormatting, action: () => run('removeFormat') },
  ]

  return (
    <div className="rich-text-editor">
      <div className="rich-text-toolbar" role="toolbar" aria-label="Formatação">
        {tools.map(({ label, icon: Icon, action }) => (
          // onMouseDown + preventDefault: o clique não tira o foco (nem a seleção) do texto.
          <button key={label} type="button" title={label} aria-label={label} onMouseDown={(e) => e.preventDefault()} onClick={action}>
            <Icon size={15} />
          </button>
        ))}
      </div>
      <div
        ref={ref}
        className={`rich-text rich-text-input${empty ? ' is-empty' : ''}`}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label={ariaLabel ?? placeholder}
        data-placeholder={placeholder}
        onFocus={() => document.execCommand('defaultParagraphSeparator', false, 'p')}
        onInput={emit}
        onPaste={handlePaste}
      />
    </div>
  )
}

// Exibe a devolutiva. `format === 'html'` indica HTML já sanitizado no servidor
// (rich-text.server.ts); sem ele, é uma devolutiva antiga em texto puro.
export function RichTextContent({
  value,
  format,
  className,
  style,
}: {
  value: string
  format?: 'html' | null
  className?: string
  style?: CSSProperties
}) {
  if (format === 'html') {
    return <div className={`rich-text${className ? ` ${className}` : ''}`} style={style} dangerouslySetInnerHTML={{ __html: value }} />
  }
  return <p className={className} style={style}>{value}</p>
}
