import { useEffect, useRef, useState } from 'react'
import { Bold, Highlighter, Italic, RemoveFormatting } from 'lucide-react'
import { colagemParaEditor, editorParaTexto, textoParaEditor } from '@/lib/texto-destacado-editor'

// Editor visual do texto de "Questões para treino" — o mesmo jeito de usar do
// editor da devolutiva da redação (RichTextEditor), mas o valor que entra e sai
// é o texto com marcadores (`==negrito==`, `~~itálico~~`, `##cor##`), que é o
// que o parser e a prova do aluno entendem. Ao colar do Google Docs/Word, o
// negrito, o itálico e os grifos/cores continuam destacados.
export function EditorTextoDestacado({
  value,
  onChange,
  placeholder,
  ariaLabel,
}: {
  value: string
  onChange: (texto: string) => void
  placeholder?: string
  ariaLabel?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  // Último texto que saiu daqui: quando `value` volta igual, é só o eco da
  // digitação — reescrever o innerHTML aí perderia o cursor. Valor diferente
  // vem de fora (abrir um conjunto pra editar, limpar o formulário).
  const ultimoEmitido = useRef<string | null>(null)
  const [vazio, setVazio] = useState(!value)

  useEffect(() => {
    if (!ref.current || value === ultimoEmitido.current) return
    ref.current.innerHTML = textoParaEditor(value)
    ultimoEmitido.current = value
    setVazio(!value)
  }, [value])

  function emitir() {
    const el = ref.current
    if (!el) return
    const texto = el.textContent?.trim() ? editorParaTexto(el) : ''
    setVazio(!texto)
    ultimoEmitido.current = texto
    onChange(texto)
  }

  function executar(comando: string, valor?: string) {
    ref.current?.focus()
    document.execCommand(comando, false, valor)
    emitir()
  }

  function alternarCor() {
    const el = ref.current
    const selecao = window.getSelection()
    if (!el || !selecao || selecao.rangeCount === 0 || selecao.isCollapsed) return
    const range = selecao.getRangeAt(0)
    if (!el.contains(range.commonAncestorContainer)) return
    const inicio = range.startContainer instanceof Element ? range.startContainer : range.startContainer.parentElement
    const jaColorido = inicio?.closest('.texto-destacado-cor')
    if (jaColorido && el.contains(jaColorido)) {
      // Tira a cor do trecho inteiro em que o cursor está.
      jaColorido.replaceWith(...Array.from(jaColorido.childNodes))
    } else {
      const span = document.createElement('span')
      span.className = 'texto-destacado-cor'
      span.appendChild(range.extractContents())
      range.insertNode(span)
      selecao.removeAllRanges()
      const nova = document.createRange()
      nova.selectNodeContents(span)
      selecao.addRange(nova)
    }
    emitir()
  }

  function limparFormatacao() {
    const el = ref.current
    if (!el) return
    executar('removeFormat')
    // removeFormat não desfaz a cor por classe — solta os spans coloridos da seleção.
    const selecao = window.getSelection()
    if (!selecao || selecao.rangeCount === 0) return
    const range = selecao.getRangeAt(0)
    for (const span of Array.from(el.querySelectorAll('.texto-destacado-cor'))) {
      if (range.intersectsNode(span)) span.replaceWith(...Array.from(span.childNodes))
    }
    emitir()
  }

  function colar(evento: React.ClipboardEvent<HTMLDivElement>) {
    const html = evento.clipboardData.getData('text/html')
    const texto = evento.clipboardData.getData('text/plain')
    evento.preventDefault()
    if (html) document.execCommand('insertHTML', false, colagemParaEditor(html))
    else if (texto) document.execCommand('insertHTML', false, textoParaEditor(texto.replace(/\r\n?/g, '\n')))
    emitir()
  }

  const ferramentas = [
    { label: 'Negrito', icon: Bold, action: () => executar('bold') },
    { label: 'Itálico', icon: Italic, action: () => executar('italic') },
    { label: 'Destaque colorido', icon: Highlighter, action: alternarCor },
    { label: 'Limpar formatação', icon: RemoveFormatting, action: limparFormatacao },
  ]

  return (
    <div className="rich-text-editor">
      <div className="rich-text-toolbar" role="toolbar" aria-label="Formatação">
        {ferramentas.map(({ label, icon: Icon, action }) => (
          // onMouseDown + preventDefault: o clique não tira o foco (nem a seleção) do texto.
          <button key={label} type="button" title={label} aria-label={label} onMouseDown={(e) => e.preventDefault()} onClick={action}>
            <Icon size={15} />
          </button>
        ))}
      </div>
      <div
        ref={ref}
        className={`rich-text-input editor-texto-destacado${vazio ? ' is-empty' : ''}`}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label={ariaLabel ?? placeholder}
        data-placeholder={placeholder}
        onFocus={() => document.execCommand('defaultParagraphSeparator', false, 'div')}
        onInput={emitir}
        onPaste={colar}
      />
    </div>
  )
}
