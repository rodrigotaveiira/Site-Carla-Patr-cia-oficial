// Camada decorativa da Área do Aluno — só os 7 elementos do último pacote
// enviado (7_elementos_Carla_Patricia_SVG): caneta, livro aberto, pilha de
// livros, capelo, estrelas, agenda com caneta e agenda espiral. Nenhum
// outro elemento (selo CPM, nome da professora, floreios) fica no fundo.
//
// Cada arquivo é um PNG com sombreado/gradiente/brilho embutido dentro de
// um wrapper SVG (public/watermark/*.svg) — sem path vetorial pra herdar
// cor, então entram como <img src> normal; só posição, tamanho, rotação e
// opacidade são controlados pelo wrapper (a cor já vem pronta do arquivo).
const RASTER_ICONS = {
  pen: '/watermark/pen.svg',
  book: '/watermark/book.svg',
  books: '/watermark/books.svg',
  cap: '/watermark/cap.svg',
  sparkles: '/watermark/sparkles.svg',
  notebookPen: '/watermark/notebook-pen.svg',
  spiralNotebook: '/watermark/spiral-notebook.svg',
}

// "tier" controla em quantas larguras de tela o elemento aparece:
// A = sempre (mobile+tablet+desktop), B = tablet+desktop, C = só desktop.
type Tier = 'A' | 'B' | 'C'

type WatermarkItem = {
  icon: keyof typeof RASTER_ICONS
  width: number // px
  height: number // px — mantém a proporção real do arquivo de origem
  top?: string
  bottom?: string
  left?: string
  right?: string
  rotate?: number
  opacity: number
  tier: Tier
}

// Posições verificadas par a par numa grade mental de 1400×800 pra
// garantir que nenhuma caixa (retângulo real do elemento) encoste na
// outra. Alguns ícones se repetem (em tamanho/posição diferentes) já que
// só temos estes 7 pra montar 10–14 elementos no desktop.
const ITEMS: WatermarkItem[] = [
  // --- tier A: os elementos que sobrevivem até o celular. No celular a
  // margem em volta dos cards é bem estreita, então esses ficam um pouco
  // mais fortes (opacidade maior) e espalhados do topo ao rodapé da página
  // pra não sumirem atrás do conteúdo.
  { icon: 'sparkles', width: 42, height: 47, top: '7%', left: '20%', opacity: 0.1, tier: 'A' },
  { icon: 'book', width: 200, height: 123, top: '-9%', left: '-6%', rotate: -5, opacity: 0.12, tier: 'A' },
  { icon: 'spiralNotebook', width: 150, height: 213, top: '30%', left: '-4%', opacity: 0.11, tier: 'A' },
  { icon: 'pen', width: 90, height: 109, top: '1%', right: '-5%', rotate: 18, opacity: 0.1, tier: 'A' },
  { icon: 'cap', width: 100, height: 86, bottom: '3%', right: '-4%', rotate: -4, opacity: 0.11, tier: 'A' },
  { icon: 'sparkles', width: 28, height: 31, bottom: '18%', left: '8%', opacity: 0.08, tier: 'A' },

  // --- tier B: entram a partir do tablet (total 7–9) ---
  { icon: 'pen', width: 150, height: 182, top: '18%', right: '-6%', rotate: 22, opacity: 0.08, tier: 'B' },
  { icon: 'cap', width: 150, height: 129, top: '42%', left: '50%', rotate: -2, opacity: 0.07, tier: 'B' },
  { icon: 'sparkles', width: 46, height: 52, top: '52%', right: '6%', opacity: 0.06, tier: 'B' },
  { icon: 'books', width: 190, height: 159, bottom: '6%', right: '8%', rotate: 4, opacity: 0.08, tier: 'B' },

  // --- tier C: só no desktop, completam a composição (total 10–14) ---
  { icon: 'notebookPen', width: 165, height: 178, top: '68%', left: '4%', rotate: -6, opacity: 0.08, tier: 'C' },
  { icon: 'cap', width: 130, height: 112, top: '20%', left: '12%', rotate: 6, opacity: 0.07, tier: 'C' },
  { icon: 'book', width: 120, height: 74, bottom: '30%', left: '46%', rotate: 5, opacity: 0.06, tier: 'C' },
  { icon: 'sparkles', width: 30, height: 34, top: '40%', left: '30%', opacity: 0.06, tier: 'C' },
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
            transform: item.rotate ? `rotate(${item.rotate}deg)` : undefined,
          }}
        >
          <img
            src={RASTER_ICONS[item.icon]}
            alt=""
            width={item.width}
            height={item.height}
            style={{ display: 'block', width: '100%', height: '100%', objectFit: 'contain' }}
          />
        </span>
      ))}
    </div>
  )
}
