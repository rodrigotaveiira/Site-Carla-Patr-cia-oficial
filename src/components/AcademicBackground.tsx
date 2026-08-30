// Camada decorativa da Área do Aluno — pacote final de marcas d'água
// fornecido (src/assets/watermark, de pack_watermarks_carla_patricia_svg):
// selo CPM, nome da professora, caneta-tinteiro, livro aberto, pilha de
// livros, capelo, caderno com caneta, bloco espiral, brilhos, floreio de
// pena, fita e degradê de pontos. Nada de Phosphor/Lucide/ícone de app —
// só estes SVGs, exatamente como fornecidos.
//
// Cada arquivo já usa `currentColor` (stroke e fill) — importados com
// `?raw` e renderizados inline, a cor e a opacidade são controladas
// inteiramente pelo wrapper (<span style={{ color, opacity }}>), sem
// tocar no conteúdo do SVG além de garantir que preencha o wrapper.
import sealSvg from '@/assets/watermark/seal.svg?raw'
import wordmarkSvg from '@/assets/watermark/wordmark.svg?raw'
import penSvg from '@/assets/watermark/pen.svg?raw'
import bookSvg from '@/assets/watermark/book.svg?raw'
import booksSvg from '@/assets/watermark/books.svg?raw'
import capSvg from '@/assets/watermark/cap.svg?raw'
import notebookPenSvg from '@/assets/watermark/notebook-pen.svg?raw'
import spiralNotebookSvg from '@/assets/watermark/spiral-notebook.svg?raw'
import sparklesSvg from '@/assets/watermark/sparkles.svg?raw'
import nibFlourishSvg from '@/assets/watermark/nib-flourish.svg?raw'
import ribbonSvg from '@/assets/watermark/ribbon.svg?raw'
import dotFadeSvg from '@/assets/watermark/dot-fade.svg?raw'

// Garante que o SVG injetado sempre preencha o wrapper que define
// posição/tamanho, não importa o viewBox de origem. Os arquivos já vêm
// com currentColor — não há cor pra trocar aqui.
function fill(svg: string) {
  return svg.replace('<svg ', '<svg width="100%" height="100%" ')
}

const ICONS = {
  seal: fill(sealSvg),
  wordmark: fill(wordmarkSvg),
  pen: fill(penSvg),
  book: fill(bookSvg),
  books: fill(booksSvg),
  cap: fill(capSvg),
  notebookPen: fill(notebookPenSvg),
  spiralNotebook: fill(spiralNotebookSvg),
  sparkles: fill(sparklesSvg),
  nibFlourish: fill(nibFlourishSvg),
  ribbon: fill(ribbonSvg),
  dotFade: fill(dotFadeSvg),
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
  { icon: 'sparkles', width: 42, height: 28, top: '9%', left: '20%', opacity: 0.05, color: INK.mid, tier: 'A' },
  { icon: 'book', width: 200, height: 154, top: '-9%', left: '-6%', rotate: -5, opacity: 0.07, color: INK.deep, tier: 'A' },
  { icon: 'seal', width: 170, height: 170, bottom: '5%', left: '6%', opacity: 0.06, color: INK.mid, tier: 'A' },
  { icon: 'ribbon', width: 480, height: 136, bottom: '-3%', left: '8%', opacity: 0.035, color: INK.soft, tier: 'A' },

  // --- tier B: entram a partir do tablet (total 7–9) ---
  { icon: 'pen', width: 165, height: 165, top: '20%', right: '-6%', rotate: 22, opacity: 0.08, color: INK.mid, tier: 'B' },
  { icon: 'wordmark', width: 360, height: 85, top: '40%', left: '54%', rotate: -1, opacity: 0.055, color: INK.deep, tier: 'B' },
  { icon: 'sparkles', width: 46, height: 31, bottom: '24%', right: '9%', opacity: 0.05, color: INK.soft, tier: 'B' },

  // --- tier C: só no desktop, completam a composição (total 10–14) ---
  { icon: 'seal', width: 190, height: 190, top: '36%', right: '-7%', rotate: 6, opacity: 0.06, color: INK.soft, tier: 'C' },
  { icon: 'books', width: 195, height: 159, top: '58%', right: '10%', rotate: 4, opacity: 0.065, color: INK.deep, tier: 'C' },
  { icon: 'cap', width: 148, height: 110, bottom: '9%', left: '46%', rotate: -4, opacity: 0.07, color: INK.mid, tier: 'C' },
  { icon: 'notebookPen', width: 170, height: 146, top: '68%', left: '4%', rotate: -6, opacity: 0.07, color: INK.deep, tier: 'C' },
  { icon: 'wordmark', width: 300, height: 71, bottom: '2%', left: '-4%', rotate: 3, opacity: 0.055, color: INK.mid, tier: 'C' },
  { icon: 'nibFlourish', width: 160, height: 105, top: '6%', right: '22%', rotate: -8, opacity: 0.05, color: INK.soft, tier: 'C' },
  { icon: 'dotFade', width: 150, height: 83, bottom: '-4%', right: '-3%', opacity: 0.045, color: INK.soft, tier: 'C' },
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
