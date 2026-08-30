// Camada decorativa da Área do Aluno — ilustrações editoriais em traço fino
// (livro, pena, pilha de livros, capelo, caderno, brilhos, linha curva —
// os SVGs personalizados fornecidos) mais o selo "CPM" e o nome da
// professora em tipografia própria, tudo numa única família de lilás, bem
// esmaecido. Poucos elementos, grandes, com bastante espaço vazio entre
// eles — pensado como marca d'água de fundo, não como grade de ícones.
//
// Importados com `?raw` e renderizados inline (não via <img>) para que
// `currentColor` herde a cor real via CSS; cada instância define sua
// própria cor dentro da família #7C3AED/#8B5CF6/#A78BFA.
import bookSvg from '@/assets/watermark/book.svg?raw'
import booksSvg from '@/assets/watermark/books.svg?raw'
import capSvg from '@/assets/watermark/graduation-cap.svg?raw'
import notebookSvg from '@/assets/watermark/notebook.svg?raw'
import penNibSvg from '@/assets/watermark/pen-nib.svg?raw'
import sparkleSvg from '@/assets/watermark/sparkle.svg?raw'
import curveSvg from '@/assets/watermark/curve.svg?raw'
import sealSvg from '@/assets/watermark/seal.svg?raw'
import wordmarkSvg from '@/assets/watermark/wordmark.svg?raw'

// Garante que o SVG injetado sempre preencha o wrapper que define
// posição/tamanho, e troca a cor fixa do arquivo original por currentColor
// — assim cada instância pode ter sua própria cor via CSS, sem precisar
// de uma cópia do arquivo por cor.
function prep(svg: string) {
  return svg
    .replace('<svg ', '<svg width="100%" height="100%" ')
    .replaceAll('#7C3AED', 'currentColor')
    .replaceAll('#C4B5FD', 'currentColor')
}

const ICONS = {
  book: prep(bookSvg),
  books: prep(booksSvg),
  cap: prep(capSvg),
  notebook: prep(notebookSvg),
  penNib: prep(penNibSvg),
  sparkle: prep(sparkleSvg),
  curve: prep(curveSvg),
  seal: prep(sealSvg),
  wordmark: prep(wordmarkSvg),
}

// Família única de lilás — quase sem variação de matiz, só um leve
// gradiente de intensidade pra dar profundidade sem chamar atenção.
const INK = { deep: '#7C3AED', mid: '#8B5CF6', soft: '#A78BFA' }

// "tier" controla em quantas larguras de tela o elemento aparece:
// A = sempre (mobile+tablet+desktop), B = tablet+desktop, C = só desktop.
type Tier = 'A' | 'B' | 'C'

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
  color: string
  tier: Tier
}

const ITEMS: WatermarkItem[] = [
  // --- tier A: os poucos elementos que sobrevivem até o celular (3–5) ---
  { icon: 'sparkle', width: 34, height: 23, top: '9%', left: '20%', opacity: 0.05, color: INK.soft, tier: 'A' },
  { icon: 'book', width: 190, height: 143, top: '-9%', left: '-6%', rotate: -5, opacity: 0.07, color: INK.deep, tier: 'A' },
  { icon: 'seal', width: 160, height: 160, bottom: '5%', left: '6%', opacity: 0.06, color: INK.mid, tier: 'A' },
  { icon: 'curve', width: 480, height: 120, bottom: '-3%', left: '8%', opacity: 0.035, color: INK.soft, tier: 'A' },

  // --- tier B: entram a partir do tablet (total 7–9) ---
  { icon: 'penNib', width: 160, height: 160, top: '20%', right: '-6%', rotate: 22, opacity: 0.08, color: INK.mid, tier: 'B' },
  { icon: 'wordmark', width: 360, height: 83, top: '40%', left: '54%', rotate: -1, opacity: 0.055, color: INK.deep, tier: 'B' },
  { icon: 'sparkle', width: 44, height: 30, bottom: '24%', right: '9%', opacity: 0.05, color: INK.soft, tier: 'B' },

  // --- tier C: só no desktop, completam a composição (total 10–14) ---
  { icon: 'seal', width: 190, height: 190, top: '36%', right: '-7%', rotate: 6, opacity: 0.06, color: INK.soft, tier: 'C' },
  { icon: 'books', width: 190, height: 158, top: '58%', right: '10%', rotate: 4, opacity: 0.065, color: INK.deep, tier: 'C' },
  { icon: 'cap', width: 145, height: 106, bottom: '9%', left: '46%', rotate: -4, opacity: 0.07, color: INK.mid, tier: 'C' },
  { icon: 'notebook', width: 170, height: 142, top: '68%', left: '4%', rotate: -6, opacity: 0.07, color: INK.deep, tier: 'C' },
  { icon: 'wordmark', width: 300, height: 69, bottom: '2%', left: '-4%', rotate: 3, opacity: 0.055, color: INK.mid, tier: 'C' },
]

const TIER_CLASS: Record<Tier, string> = {
  A: 'wm-item',
  B: 'wm-item wm-tier-b',
  C: 'wm-item wm-tier-c',
}

export function AcademicBackground() {
  return (
    <div className="academic-background" aria-hidden="true">
      {ITEMS.map((item, index) => (
        <span
          key={index}
          className={TIER_CLASS[item.tier]}
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
