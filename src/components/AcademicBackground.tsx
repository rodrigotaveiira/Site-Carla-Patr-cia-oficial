// Camada decorativa da Área do Aluno.
//
// Dois tipos de elemento aqui:
// 1. "vector" — selo CPM, nome da professora, fita e floreio de pena
//    (src/assets/watermark/*.svg, pacote pack_watermarks_carla_patricia_svg).
//    Usam currentColor; importados com `?raw` e renderizados inline pra
//    herdar cor/opacidade do wrapper via CSS.
// 2. "raster" — caneta, livro, pilha de livros, capelo, brilhos, agenda
//    com caneta e agenda espiral (public/watermark/*.svg, pacote
//    7_elementos_Carla_Patricia_SVG). Cada arquivo é um PNG com
//    sombreado/gradiente/brilho embutido dentro de um wrapper SVG — não
//    tem path vetorial pra herdar cor, então entram como <img src>
//    normal; só posição, tamanho, rotação e opacidade são controlados
//    pelo wrapper (a cor já vem pronta do arquivo).
import sealSvg from '@/assets/watermark/seal.svg?raw'
import wordmarkSvg from '@/assets/watermark/wordmark.svg?raw'
import nibFlourishSvg from '@/assets/watermark/nib-flourish.svg?raw'
import ribbonSvg from '@/assets/watermark/ribbon.svg?raw'

// Garante que o SVG vetorial injetado sempre preencha o wrapper que
// define posição/tamanho, não importa o viewBox de origem.
function fill(svg: string) {
  return svg.replace('<svg ', '<svg width="100%" height="100%" ')
}

const VECTOR_ICONS = {
  seal: fill(sealSvg),
  wordmark: fill(wordmarkSvg),
  nibFlourish: fill(nibFlourishSvg),
  ribbon: fill(ribbonSvg),
}

const RASTER_ICONS = {
  pen: '/watermark/pen.svg',
  book: '/watermark/book.svg',
  books: '/watermark/books.svg',
  cap: '/watermark/cap.svg',
  sparkles: '/watermark/sparkles.svg',
  notebookPen: '/watermark/notebook-pen.svg',
  spiralNotebook: '/watermark/spiral-notebook.svg',
}

// Família única de lilás pros elementos vetoriais — quase sem variação de
// matiz, só um leve gradiente de intensidade pra dar profundidade sem
// chamar atenção. Os elementos raster já vêm com a própria cor/sombreado.
const INK = { deep: '#7C3AED', mid: '#8B5CF6', soft: '#A78BFA' }

// "tier" controla em quantas larguras de tela o elemento aparece:
// A = sempre (mobile+tablet+desktop), B = tablet+desktop, C = só desktop.
type Tier = 'A' | 'B' | 'C'

type WatermarkItem = {
  kind: 'vector' | 'raster'
  icon: keyof typeof VECTOR_ICONS | keyof typeof RASTER_ICONS
  width: number // px
  height: number // px — mantém a proporção real do arquivo de origem
  top?: string
  bottom?: string
  left?: string
  right?: string
  rotate?: number
  opacity: number
  color?: string
  tier: Tier
}

// Posições recalculadas numa grade mental de 1400×800 pra garantir que
// nenhuma caixa (retângulo real do elemento, não só o "centro") encoste
// na outra — antes tinha selo+caderno e caneta+selo se sobrepondo,
// criando aquele resíduo/mancha estranha atrás do conteúdo.
const ITEMS: WatermarkItem[] = [
  // --- tier A: os poucos elementos que sobrevivem até o celular (3–5) ---
  { kind: 'raster', icon: 'sparkles', width: 42, height: 47, top: '7%', left: '20%', opacity: 0.06, tier: 'A' },
  { kind: 'raster', icon: 'book', width: 200, height: 123, top: '-9%', left: '-6%', rotate: -5, opacity: 0.08, tier: 'A' },
  { kind: 'vector', icon: 'seal', width: 150, height: 150, top: '46%', left: '-4%', opacity: 0.06, color: INK.mid, tier: 'A' },
  { kind: 'vector', icon: 'ribbon', width: 480, height: 136, bottom: '-3%', left: '34%', opacity: 0.035, color: INK.soft, tier: 'A' },

  // --- tier B: entram a partir do tablet (total 7–9) ---
  { kind: 'raster', icon: 'pen', width: 150, height: 182, top: '18%', right: '-6%', rotate: 22, opacity: 0.08, tier: 'B' },
  { kind: 'vector', icon: 'wordmark', width: 340, height: 80, top: '42%', left: '50%', rotate: -1, opacity: 0.055, color: INK.deep, tier: 'B' },
  { kind: 'raster', icon: 'sparkles', width: 46, height: 52, top: '52%', right: '6%', opacity: 0.06, tier: 'B' },

  // --- tier C: só no desktop, completam a composição (total 10–14) ---
  { kind: 'vector', icon: 'seal', width: 180, height: 180, top: '22%', left: '12%', rotate: 6, opacity: 0.06, color: INK.soft, tier: 'C' },
  { kind: 'raster', icon: 'books', width: 190, height: 159, bottom: '6%', right: '8%', rotate: 4, opacity: 0.08, tier: 'C' },
  { kind: 'raster', icon: 'cap', width: 145, height: 125, bottom: '28%', left: '46%', rotate: -4, opacity: 0.08, tier: 'C' },
  { kind: 'raster', icon: 'notebookPen', width: 165, height: 178, top: '68%', left: '3%', rotate: -6, opacity: 0.08, tier: 'C' },
  { kind: 'vector', icon: 'wordmark', width: 280, height: 66, bottom: '-2%', left: '8%', rotate: 3, opacity: 0.055, color: INK.mid, tier: 'C' },
  { kind: 'vector', icon: 'nibFlourish', width: 150, height: 100, top: '5%', right: '24%', rotate: -8, opacity: 0.05, color: INK.soft, tier: 'C' },
  { kind: 'raster', icon: 'spiralNotebook', width: 130, height: 184, top: '40%', left: '30%', rotate: 6, opacity: 0.07, tier: 'C' },
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
        >
          {item.kind === 'vector' ? (
            <span
              style={{ display: 'block', width: '100%', height: '100%' }}
              dangerouslySetInnerHTML={{ __html: VECTOR_ICONS[item.icon as keyof typeof VECTOR_ICONS] }}
            />
          ) : (
            <img
              src={RASTER_ICONS[item.icon as keyof typeof RASTER_ICONS]}
              alt=""
              width={item.width}
              height={item.height}
              style={{ display: 'block', width: '100%', height: '100%', objectFit: 'contain' }}
            />
          )}
        </span>
      ))}
    </div>
  )
}
