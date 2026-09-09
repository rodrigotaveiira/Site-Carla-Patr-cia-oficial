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

// Posições distribuídas em faixas verticais (aprox. a cada 10–15% de altura,
// alternando os lados) pra cobrir a página inteira de forma uniforme sem
// virar grade — cada faixa varia levemente o ícone, o tamanho e a rotação
// pra manter o espalhamento orgânico. Como .student-main-stack (o
// container) acompanha a altura real do conteúdo (ver _app.tsx), essas
// porcentagens valem tanto pra uma tela curta quanto pra uma lista longa.
// Os mesmos 7 ícones se repetem em tamanhos/posições diferentes.
const ITEMS: WatermarkItem[] = [
  // --- tier A: os elementos que sobrevivem até o celular. No celular a
  // margem em volta dos cards é bem estreita, então esses ficam um pouco
  // mais fortes (opacidade maior) e espalhados do topo ao rodapé da página
  // pra não sumirem atrás do conteúdo.
  { icon: 'sparkles', width: 42, height: 47, top: '4%', left: '20%', opacity: 0.1, tier: 'A' },
  { icon: 'book', width: 200, height: 123, top: '-8%', left: '-6%', rotate: -5, opacity: 0.12, tier: 'A' },
  { icon: 'pen', width: 90, height: 109, top: '2%', right: '-5%', rotate: 18, opacity: 0.1, tier: 'A' },
  { icon: 'spiralNotebook', width: 150, height: 213, top: '26%', left: '-5%', opacity: 0.11, tier: 'A' },
  { icon: 'cap', width: 84, height: 72, top: '44%', left: '10%', rotate: 9, opacity: 0.09, tier: 'A' },
  { icon: 'sparkles', width: 30, height: 34, top: '58%', right: '8%', opacity: 0.08, tier: 'A' },
  { icon: 'book', width: 140, height: 86, top: '70%', left: '-4%', rotate: 6, opacity: 0.1, tier: 'A' },
  { icon: 'cap', width: 100, height: 86, bottom: '4%', right: '-4%', rotate: -4, opacity: 0.11, tier: 'A' },
  { icon: 'sparkles', width: 28, height: 31, bottom: '20%', left: '8%', opacity: 0.08, tier: 'A' },
  { icon: 'pen', width: 70, height: 85, bottom: '36%', right: '16%', rotate: -16, opacity: 0.08, tier: 'A' },

  // --- tier B: entram a partir do tablet (total 17) ---
  { icon: 'pen', width: 150, height: 182, top: '14%', right: '-6%', rotate: 22, opacity: 0.08, tier: 'B' },
  { icon: 'book', width: 110, height: 68, top: '8%', left: '34%', rotate: -8, opacity: 0.07, tier: 'B' },
  { icon: 'cap', width: 140, height: 121, top: '36%', left: '48%', rotate: -3, opacity: 0.07, tier: 'B' },
  { icon: 'sparkles', width: 46, height: 52, top: '52%', right: '6%', opacity: 0.06, tier: 'B' },
  { icon: 'spiralNotebook', width: 100, height: 142, top: '64%', left: '24%', rotate: 5, opacity: 0.07, tier: 'B' },
  { icon: 'notebookPen', width: 90, height: 97, bottom: '48%', left: '44%', rotate: 10, opacity: 0.07, tier: 'B' },
  { icon: 'books', width: 180, height: 151, bottom: '20%', right: '12%', rotate: 4, opacity: 0.08, tier: 'B' },

  // --- tier C: só no desktop, completam a composição (total 25) ---
  { icon: 'books', width: 150, height: 126, top: '2%', left: '60%', rotate: -6, opacity: 0.06, tier: 'C' },
  { icon: 'cap', width: 120, height: 103, top: '18%', left: '12%', rotate: 6, opacity: 0.07, tier: 'C' },
  { icon: 'sparkles', width: 30, height: 34, top: '32%', left: '28%', opacity: 0.06, tier: 'C' },
  { icon: 'notebookPen', width: 165, height: 178, top: '50%', left: '4%', rotate: -6, opacity: 0.08, tier: 'C' },
  { icon: 'pen', width: 80, height: 97, bottom: '64%', right: '30%', rotate: -14, opacity: 0.06, tier: 'C' },
  { icon: 'book', width: 120, height: 74, bottom: '36%', left: '54%', rotate: 5, opacity: 0.06, tier: 'C' },
  { icon: 'cap', width: 90, height: 78, bottom: '14%', left: '60%', rotate: 8, opacity: 0.06, tier: 'C' },
  { icon: 'sparkles', width: 34, height: 38, bottom: '2%', left: '32%', opacity: 0.06, tier: 'C' },
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
