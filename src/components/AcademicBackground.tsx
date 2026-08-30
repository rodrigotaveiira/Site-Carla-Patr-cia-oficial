// Camada decorativa da Área do Aluno — os 10 SVGs fornecidos (selo CPM, nome
// da professora, caneta-tinteiro, livro, pilha de livros, capelo, caderno,
// bloco de notas, brilhos e linha curva) espalhados de forma orgânica atrás
// do conteúdo, como textura de marca d'água. Usa os arquivos exatamente como
// enviados (em public/watermark), sem redesenhar nada.
//
// Cada item define posição (top/left ou bottom/right, em %, permitindo
// valores negativos pra cortar nas bordas), tamanho, rotação e opacidade.
// `mobile` marca os poucos itens que continuam visíveis em telas pequenas —
// os demais somem via CSS (.wm-desktop-only) pra não poluir o celular.
type WatermarkItem = {
  src: string
  size: number // px, lado maior do SVG
  top?: string
  bottom?: string
  left?: string
  right?: string
  rotate?: number
  opacity: number
  mobile?: boolean
}

const ITEMS: WatermarkItem[] = [
  // Selo CPM — maior, opacidade baixa (~6%)
  { src: '01_logo_cpm.svg', size: 130, top: '8%', right: '5%', rotate: -6, opacity: 0.06 },
  { src: '01_logo_cpm.svg', size: 150, bottom: '10%', left: '-4%', rotate: 10, opacity: 0.06 },
  // Nome "Carla Patrícia" — maior, opacidade baixa (~6%)
  { src: '02_carla_patricia.svg', size: 250, top: '34%', left: '56%', rotate: -3, opacity: 0.06 },
  { src: '02_carla_patricia.svg', size: 210, bottom: '6%', left: '4%', rotate: 4, opacity: 0.06 },
  // Brilhos — pequenos, opacidade mais alta (~8-10%)
  { src: '09_brilhos.svg', size: 40, top: '7%', left: '22%', opacity: 0.1, mobile: true },
  { src: '09_brilhos.svg', size: 46, bottom: '18%', right: '6%', opacity: 0.1, mobile: true },
  { src: '09_brilhos.svg', size: 26, top: '46%', left: '4%', opacity: 0.08 },
  // Caneta-tinteiro
  { src: '03_caneta_tinteiro.svg', size: 95, top: '20%', left: '74%', rotate: 28, opacity: 0.09, mobile: true },
  { src: '03_caneta_tinteiro.svg', size: 72, bottom: '22%', left: '22%', rotate: -18, opacity: 0.08 },
  // Livro aberto
  { src: '04_livro_aberto.svg', size: 115, top: '26%', left: '6%', rotate: -6, opacity: 0.08, mobile: true },
  // Pilha de livros
  { src: '05_pilha_livros.svg', size: 100, top: '52%', left: '36%', rotate: 4, opacity: 0.08 },
  // Capelo de formatura
  { src: '06_capelo_formatura.svg', size: 100, bottom: '8%', left: '44%', rotate: -4, opacity: 0.08, mobile: true },
  { src: '06_capelo_formatura.svg', size: 80, top: '44%', right: '22%', rotate: 8, opacity: 0.07 },
  // Caderno com caneta
  { src: '07_caderno_caneta.svg', size: 95, top: '64%', left: '8%', rotate: -8, opacity: 0.08 },
  // Bloco de notas
  { src: '08_bloco_notas.svg', size: 90, top: '30%', left: '26%', rotate: 6, opacity: 0.08, mobile: true },
  // Linha curva
  { src: '10_linha_curva.svg', size: 300, bottom: '14%', left: '-6%', rotate: 3, opacity: 0.06 },
]

export function AcademicBackground() {
  return (
    <div className="academic-background" aria-hidden="true">
      {ITEMS.map((item, index) => (
        <img
          key={index}
          src={`/watermark/${item.src}`}
          alt=""
          className={item.mobile ? undefined : 'wm-desktop-only'}
          style={{
            width: item.size,
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
