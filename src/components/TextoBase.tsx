import type { SimuladoPassage } from '@/lib/simulado-parser'

// Texto-base de uma atividade: aparece logo antes das questões que dependem
// dele. O corpo vai com `white-space: pre-wrap` porque parágrafos, citações e
// a linha de fonte/referência precisam sair exatamente como foram colados.
export function TextoBase({ passage }: { passage: SimuladoPassage }) {
  return (
    <article className="texto-base">
      {passage.label && <div className="texto-base-label">{passage.label}</div>}
      <div className="texto-base-corpo">{passage.content}</div>
    </article>
  )
}
