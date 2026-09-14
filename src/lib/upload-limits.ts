// Teto de tamanho dos arquivos enviados pelos formulários.
//
// Fica separado de `upload-validation.ts` de propósito: aquele usa `Buffer` e só
// roda no servidor, e estes números precisam valer também no navegador, pra
// barrar o arquivo ANTES do envio.
//
// Por que 4MB e não mais: o arquivo viaja embutido na requisição, em base64, que
// infla o tamanho em 1/3. As funções da Netlify recusam corpo acima de 6MB, e a
// recusa acontece na BORDA — a função nem roda, ninguém responde, e o formulário
// fica preso em "Enviando..." pra sempre. 4MB de arquivo viram ~5,5MB de corpo,
// que passa com folga.

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024

/** Comprimento máximo da data URL correspondente (base64 infla 4/3, mais o prefixo). */
export const MAX_UPLOAD_DATA_URL_LENGTH = Math.ceil(MAX_UPLOAD_BYTES / 3) * 4 + 200

// --- Envio em pedaços ---------------------------------------------------
//
// Partindo o arquivo em pedaços, cada requisição fica pequena e o tamanho total
// deixa de esbarrar nos 6MB. O pedaço é de 3MB (4MB em base64) pra sobrar folga
// dentro do limite de cada requisição.

export const MAX_CHUNK_BYTES = 3 * 1024 * 1024
export const MAX_CHUNK_DATA_LENGTH = Math.ceil(MAX_CHUNK_BYTES / 3) * 4 + 200

/** Teto do arquivo inteiro quando enviado em pedaços. */
export const MAX_CHUNKED_UPLOAD_BYTES = 12 * 1024 * 1024

/** Acima disto o envio vai em pedaços; abaixo, vai de uma vez só (mais rápido). */
export const CHUNKED_UPLOAD_THRESHOLD_BYTES = MAX_UPLOAD_BYTES

/**
 * Mensagem pronta quando o arquivo passa até do teto do envio em pedaços —
 * `null` quando cabe.
 */
export function erroDeTamanhoDeUploadGrande(file: { size: number }): string | null {
  if (file.size <= MAX_CHUNKED_UPLOAD_BYTES) return null
  return `Esse arquivo tem ${formatarTamanho(file.size)} e o limite é ${formatarTamanho(MAX_CHUNKED_UPLOAD_BYTES)}. `
    + 'Comprima o PDF ou divida o conteúdo em dois arquivos antes de enviar.'
}

/** Em quantos pedaços um arquivo desse tamanho vai ser partido. */
export function contarPedacos(bytes: number): number {
  return Math.max(1, Math.ceil(bytes / MAX_CHUNK_BYTES))
}

// --- Download em pedaços ------------------------------------------------
//
// A resposta de uma função também para em 6MB. Cada pedaço de download é medido
// em caracteres de base64 (é assim que ele viaja), com folga pro resto da
// resposta. Múltiplo de 4 pra cair em fronteira de base64.
export const DOWNLOAD_CHUNK_CHARS = 4 * 1024 * 1024

export function formatarTamanho(bytes: number): string {
  const mb = bytes / (1024 * 1024)
  if (mb >= 10) return `${Math.round(mb)}MB`
  if (mb >= 1) return `${mb.toFixed(1).replace('.', ',')}MB`
  return `${Math.max(1, Math.round(bytes / 1024))}KB`
}

/**
 * Mensagem pronta quando o arquivo escolhido não cabe — `null` quando cabe.
 * Usada no navegador pra avisar na hora, em vez de deixar o envio travar.
 */
export function erroDeTamanhoDeUpload(file: { size: number }): string | null {
  if (file.size <= MAX_UPLOAD_BYTES) return null
  return `Esse arquivo tem ${formatarTamanho(file.size)} e o limite é ${formatarTamanho(MAX_UPLOAD_BYTES)}. `
    + 'Comprima o PDF ou divida o conteúdo em dois arquivos antes de enviar.'
}
