import type { CSSProperties } from 'react'
import type { SimuladoPassage } from '@/lib/simulado-parser'

// Texto-base de uma atividade: aparece logo antes das questões que dependem
// dele. O corpo vai com `white-space: pre-wrap` porque parágrafos, citações e
// a linha de fonte/referência precisam sair exatamente como foram colados.
//
// `estilo` é a aparência que a professora definiu no painel (cor, tamanho e
// tipo de letra). Sem ele, vale o que está no CSS.
export function TextoBase({ passage, estilo }: { passage: SimuladoPassage; estilo?: CSSProperties }) {
  return (
    <article className="texto-base">
      {passage.label && <div className="texto-base-label">{passage.label}</div>}
      <div className="texto-base-corpo" style={estilo}>{passage.content}</div>
    </article>
  )
}
