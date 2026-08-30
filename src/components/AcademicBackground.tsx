// Camada decorativa da Área do Aluno — recortes reais da ilustração de
// referência (selo CPM, "Carla Patrícia", livro, pilha de livros, capelo,
// caderno, bloco de notas, canetas e brilhos) espalhados de forma orgânica
// atrás do conteúdo, como textura de marca d'água. Os recortes preservam o
// sombreado/traço original da imagem (em public/watermark-photo) em vez de
// reconstruir os ícones em vetor puro; só a linha decorativa abstrata usa o
// SVG fornecido (public/watermark/curve.svg), por não ter volume próprio.
type WatermarkItem = {
  src: string
  width: number // px
  top?: string
  bottom?: string
  left?: string
  right?: string
  rotate?: number
  opacity: number
  mobile?: boolean
}

const P = '/watermark-photo/'

const ITEMS: WatermarkItem[] = [
  // Selo CPM e nome — elementos de identidade, opacidade mais baixa (~6%)
  { src: P + 'seal1.png', width: 130, top: '8%', right: '4%', rotate: -4, opacity: 0.4 },
  { src: P + 'seal2.png', width: 150, bottom: '9%', left: '-4%', rotate: 6, opacity: 0.4 },
  { src: P + 'seal3.png', width: 110, top: '48%', left: '2%', rotate: -6, opacity: 0.35 },
  { src: P + 'wordmark1.png', width: 260, top: '34%', left: '55%', rotate: -2, opacity: 0.4 },
  { src: P + 'wordmark2.png', width: 230, bottom: '5%', left: '5%', rotate: 2, opacity: 0.4 },
  // Brilhos — pequenos, opacidade mais alta (~10%)
  { src: P + 'sparkle.png', width: 34, top: '6%', left: '24%', opacity: 0.55, mobile: true },
  { src: P + 'sparkle.png', width: 44, bottom: '20%', right: '7%', opacity: 0.55, mobile: true },
  { src: P + 'sparkle.png', width: 24, top: '58%', right: '30%', opacity: 0.5 },
  // Canetas
  { src: P + 'pen-small.png', width: 90, top: '20%', left: '73%', rotate: 20, opacity: 0.5, mobile: true },
  { src: P + 'pen-large.png', width: 130, bottom: '22%', left: '24%', rotate: -14, opacity: 0.45 },
  // Livro aberto
  { src: P + 'book1.png', width: 120, top: '25%', left: '7%', rotate: -4, opacity: 0.45, mobile: true },
  { src: P + 'book2.png', width: 130, bottom: '30%', right: '13%', rotate: 4, opacity: 0.42 },
  // Pilha de livros
  { src: P + 'stack.png', width: 105, top: '54%', left: '35%', rotate: 3, opacity: 0.42 },
  // Capelo de formatura
  { src: P + 'cap.png', width: 100, bottom: '7%', left: '43%', rotate: -3, opacity: 0.42, mobile: true },
  // Caderno com caneta e bloco de notas
  { src: P + 'notebook-pen.png', width: 100, top: '65%', left: '8%', rotate: -6, opacity: 0.42 },
  { src: P + 'notepad.png', width: 95, top: '30%', left: '27%', rotate: 5, opacity: 0.42, mobile: true },
  // Linha curva decorativa — único elemento em vetor puro
  { src: '/watermark/curve.svg', width: 300, bottom: '13%', left: '-5%', rotate: 2, opacity: 0.35 },
]

export function AcademicBackground() {
  return (
    <div className="academic-background" aria-hidden="true">
      {ITEMS.map((item, index) => (
        <img
          key={index}
          src={item.src}
          alt=""
          className={item.mobile ? undefined : 'wm-desktop-only'}
          style={{
            width: item.width,
            top: item.top,
            bottom: item.bottom,
            left: item.left,
            right: item.right,
            opacity: item.opacity,
            transform: item.rotate ? `rotate(${item.rotate}deg)` : undefined,
          }}
        />
      ))}
    </div>
  )
}
