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
