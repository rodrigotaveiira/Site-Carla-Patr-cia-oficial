import type { ReactNode } from 'react'

// Marcadores de destaque dentro do texto colado em "Questões para treino": a
// professora escreve `==palavra==` pra negrito, `~~palavra~~` pra itálico ou
// `##palavra##` pra cor ao redor do trecho que quer realçar (no texto-base,
// no enunciado ou numa alternativa), e isso vira `<strong>`/`<em>`/`<span>`
// na tela — tanto na conferência do admin quanto na prova do aluno.
//
// `<strong>` (não `<mark>`) pro negrito: é negrito de verdade que se
// destaca, não uma marcação com fundo. Pra ele aparecer, o texto em volta
// não pode ser negrito — por isso o enunciado tem peso normal
// (`.enunciado-questao` em styles.css).
//
// `~~` (não `_texto_`) pro itálico: um traço só embaixo aparece sozinho em
// lacuna de exercício ("complete: ______"), e viraria itálico por engano.
// Dois travessões não aparecem em texto corrido nem em lacuna.
//
// `##` pra cor: usa a cor roxa da marca (ver `.texto-destacado-cor` em
// styles.css), a mesma que já sinaliza destaque no resto do site.
//
// Não é HTML de verdade: nunca passa por dangerouslySetInnerHTML, só
// reconhece esses marcadores específicos dentro de uma string e devolve o
// resto como texto puro — não abre brecha de XSS mesmo colando texto de
// qualquer lugar. `.` não casa quebra de linha, então o marcador não
// atravessa parágrafos por acidente.
//
// Os marcadores podem vir um dentro do outro (`##==palavra==##` = negrito e
// colorido) — o editor visual gera assim quando o trecho tem mais de um
// destaque — então o miolo de cada um passa de novo por aqui.
const DESTAQUE = /==(.+?)==|~~(.+?)~~|##(.+?)##/g

export function renderComDestaque(texto: string): ReactNode {
  if (!texto || (!texto.includes('==') && !texto.includes('~~') && !texto.includes('##'))) return texto

  const partes: ReactNode[] = []
  let ultimoIndice = 0
  let chave = 0

  for (const match of texto.matchAll(DESTAQUE)) {
    const indice = match.index ?? 0
    if (indice > ultimoIndice) partes.push(texto.slice(ultimoIndice, indice))
    if (match[1] !== undefined) {
      partes.push(<strong key={chave++} className="texto-destacado">{renderComDestaque(match[1])}</strong>)
    } else if (match[2] !== undefined) {
      partes.push(<em key={chave++} className="texto-destacado-italico">{renderComDestaque(match[2])}</em>)
    } else {
      partes.push(<span key={chave++} className="texto-destacado-cor">{renderComDestaque(match[3])}</span>)
    }
    ultimoIndice = indice + match[0].length
  }

  if (partes.length === 0) return texto
  if (ultimoIndice < texto.length) partes.push(texto.slice(ultimoIndice))

  return partes
}
