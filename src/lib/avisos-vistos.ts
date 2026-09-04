// Marca ate onde o aluno já viu os avisos do sino.
//
// Guarda só a data do aviso mais recente que ele viu, não a lista de ids: o
// que interessa é "chegou algo depois disso?". Assim o registro não cresce, e
// aviso que sai da janela de 7 dias não deixa lixo pra trás.
//
// Fica no localStorage do aparelho, de propósito: é preferência de leitura, não
// dado de aluno, e não vale gastar uma ida ao servidor. O custo é que o ponto
// reaparece se ele trocar de aparelho — aceitável pro que isso sinaliza.

const CHAVE = 'cpm:avisos-vistos-em'

export function lerAvisosVistosEm(): string {
  if (typeof window === 'undefined') return ''
  try {
    return window.localStorage.getItem(CHAVE) ?? ''
  } catch {
    // Navegador com armazenamento bloqueado: sem memória de leitura, o ponto
    // simplesmente continua aparecendo. Melhor que quebrar o dashboard.
    return ''
  }
}

export function salvarAvisosVistosEm(data: string): void {
  if (typeof window === 'undefined' || !data) return
  try {
    window.localStorage.setItem(CHAVE, data)
  } catch {
    // idem
  }
}

/**
 * Se ha aviso mais novo do que o ultimo que o aluno viu.
 * As duas datas sao ISO, entao comparar como texto ja ordena certo.
 */
export function temAvisoNaoVisto(dataMaisRecente: string, vistoEm: string): boolean {
  if (!dataMaisRecente) return false
  return dataMaisRecente > vistoEm
}
