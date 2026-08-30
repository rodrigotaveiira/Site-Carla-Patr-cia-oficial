// Camada decorativa da Área do Aluno — ícones de um pacote profissional
// (Phosphor Icons, licença MIT — ver src/assets/watermark/LICENSE-phosphor.txt)
// no mesmo espírito da referência (caneta, livro, capelo, caderno, brilho),
// mais o selo "CPM" e o nome da professora em tipografia limpa (não são
// ícones de biblioteca — são vetores próprios, na mesma pasta). Tudo
// espalhado de forma orgânica atrás do conteúdo, como marca d'água.
//
// Importados com `?raw` e renderizados inline (não via <img>) para que
// `currentColor` herde a cor real via CSS — um <img> de SVG externo não
// herda cor da página.
import bookSvg from '@/assets/watermark/book.svg?raw'
import booksSvg from '@/assets/watermark/books.svg?raw'
import capSvg from '@/assets/watermark/graduation-cap.svg?raw'
import notebookSvg from '@/assets/watermark/notebook.svg?raw'
import notePencilSvg from '@/assets/watermark/note-pencil.svg?raw'
import penNibSvg from '@/assets/watermark/pen-nib.svg?raw'
import featherSvg from '@/assets/watermark/feather.svg?raw'
import sparkleSvg from '@/assets/watermark/sparkle.svg?raw'
import curveSvg from '@/assets/watermark/curve.svg?raw'
import sealSvg from '@/assets/watermark/seal.svg?raw'
import wordmarkSvg from '@/assets/watermark/wordmark.svg?raw'

// Garante que o SVG injetado sempre preencha o wrapper que define
// posição/tamanho, não importa o viewBox de origem.
function fill(svg: string) {
  return svg.replace('<svg ', '<svg width="100%" height="100%" ')
}

const ICONS = {
  book: fill(bookSvg),
  books: fill(booksSvg),
  cap: fill(capSvg),
  notebook: fill(notebookSvg),
  notePencil: fill(notePencilSvg),
  penNib: fill(penNibSvg),
  feather: fill(featherSvg),
  sparkle: fill(sparkleSvg),
  curve: fill(curveSvg),
  seal: fill(sealSvg),
  wordmark: fill(wordmarkSvg),
}

type WatermarkItem = {
  icon: keyof typeof ICONS
  width: number // px
  height: number // px — mantém a proporção real do viewBox de origem
  top?: string
  bottom?: string
  left?: string
  right?: string
  rotate?: number
  opacity: number
  color?: string
  mobile?: boolean
}

const ITEMS: WatermarkItem[] = [
  // Selo CPM e nome — elementos de identidade, opacidade mais baixa (~6%)
  { icon: 'seal', width: 110, height: 110, top: '8%', right: '4%', rotate: -4, opacity: 0.07, color: 'var(--purple)' },
  { icon: 'seal', width: 130, height: 130, bottom: '9%', left: '-4%', rotate: 6, opacity: 0.07, color: 'var(--purple)' },
  { icon: 'wordmark', width: 230, height: 53, top: '35%', left: '55%', rotate: -2, opacity: 0.07, color: 'var(--navy)' },
  { icon: 'wordmark', width: 210, height: 48, bottom: '5%', left: '5%', rotate: 2, opacity: 0.07, color: 'var(--navy)' },
  // Brilhos — pequenos, opacidade mais alta (~10%)
  { icon: 'sparkle', width: 26, height: 26, top: '6%', left: '24%', opacity: 0.12, color: 'var(--gold)', mobile: true },
  { icon: 'sparkle', width: 34, height: 34, bottom: '20%', right: '7%', opacity: 0.12, color: 'var(--gold)', mobile: true },
  { icon: 'sparkle', width: 18, height: 18, top: '58%', right: '30%', opacity: 0.1, color: 'var(--gold)' },
  // Canetas
  { icon: 'penNib', width: 60, height: 60, top: '20%', left: '73%', rotate: 20, opacity: 0.09, color: 'var(--purple)', mobile: true },
  { icon: 'feather', width: 78, height: 78, bottom: '22%', left: '24%', rotate: -18, opacity: 0.08, color: 'var(--purple)' },
  // Livro aberto
  { icon: 'book', width: 92, height: 92, top: '25%', left: '7%', rotate: -4, opacity: 0.08, color: 'var(--navy)', mobile: true },
  { icon: 'book', width: 84, height: 84, bottom: '30%', right: '13%', rotate: 6, opacity: 0.08, color: 'var(--navy)' },
  // Pilha de livros
  { icon: 'books', width: 90, height: 90, top: '54%', left: '35%', rotate: 4, opacity: 0.08, color: 'var(--navy)' },
  // Capelo de formatura
  { icon: 'cap', width: 88, height: 88, bottom: '7%', left: '43%', rotate: -3, opacity: 0.08, color: 'var(--purple)', mobile: true },
  // Caderno e anotações
  { icon: 'notePencil', width: 82, height: 82, top: '65%', left: '8%', rotate: -6, opacity: 0.08, color: 'var(--navy)' },
  { icon: 'notebook', width: 74, height: 74, top: '30%', left: '27%', rotate: 5, opacity: 0.08, color: 'var(--navy)', mobile: true },
  // Linha curva decorativa
  { icon: 'curve', width: 280, height: 70, bottom: '13%', left: '-5%', rotate: 2, opacity: 0.06, color: 'var(--purple)' },
]

export function AcademicBackground() {
  return (
    <div className="academic-background" aria-hidden="true">
      {ITEMS.map((item, index) => (
        <span
          key={index}
          className={item.mobile ? 'wm-item' : 'wm-item wm-desktop-only'}
          style={{
            width: item.width,
            height: item.height,
            top: item.top,
            bottom: item.bottom,
            left: item.left,
            right: item.right,
            opacity: item.opacity,
            color: item.color,
            transform: item.rotate ? `rotate(${item.rotate}deg)` : undefined,
          }}
          dangerouslySetInnerHTML={{ __html: ICONS[item.icon] }}
        />
      ))}
    </div>
  )
}
