import type { ReactNode } from 'react'

// Marcador de destaque dentro do texto colado em "Questões para treino": a
// professora escreve `==palavra==` ao redor do trecho que quer realçar (no
// texto-base, no enunciado ou numa alternativa), e isso vira um <strong> em
// negrito na tela — tanto na conferência do admin quanto na prova do aluno.
// `<strong>` (não `<mark>`): é negrito de verdade que se destaca, não uma
// marcação com fundo — e o peso em CSS é forçado pra 900 porque o enunciado
// já é exibido dentro de um <b>, então um simples "bold" ficaria do mesmo
// peso do resto do texto e o destaque desapareceria ali.
//
// Não é HTML de verdade: nunca passa por dangerouslySetInnerHTML, só
// reconhece esse marcador específico dentro de uma string e devolve o resto
// como texto puro — não abre brecha de XSS mesmo colando texto de qualquer
// lugar. `.` não casa quebra de linha, então o marcador não atravessa
// parágrafos por acidente.
const DESTAQUE = /==(.+?)==/g

export function renderComDestaque(texto: string): ReactNode {
  if (!texto || !texto.includes('==')) return texto

  const partes: ReactNode[] = []
  let ultimoIndice = 0
  let chave = 0

  for (const match of texto.matchAll(DESTAQUE)) {
    const indice = match.index ?? 0
    if (indice > ultimoIndice) partes.push(texto.slice(ultimoIndice, indice))
    partes.push(
      <strong key={chave++} className="texto-destacado">
        {match[1]}
      </strong>,
    )
    ultimoIndice = indice + match[0].length
  }

  if (partes.length === 0) return texto
  if (ultimoIndice < texto.length) partes.push(texto.slice(ultimoIndice))

  return partes
}
