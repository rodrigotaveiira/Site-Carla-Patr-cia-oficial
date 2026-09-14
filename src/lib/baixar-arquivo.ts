import { getDownloadChunk, finishChunkedDownload, type PreparedDownload } from './download-chunks'
import { downloadDataUrl } from './download-file'

// Lado do navegador do download.
//
// Arquivo pequeno volta inteiro, como sempre foi. Arquivo grande volta em
// pedaços, porque a resposta de uma função da Netlify também para em 6MB — o
// navegador puxa pedaço a pedaço e remonta aqui (ver download-chunks.ts).

function base64ParaBlob(base64: string, mime: string): Blob {
  const binario = atob(base64)
  const bytes = new Uint8Array(binario.length)
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

function salvarBlob(fileName: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Solta a memória do blob depois que o navegador pegou o arquivo.
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

/**
 * Salva no computador do aluno o arquivo preparado pelo servidor.
 *
 * @param onProgresso recebe 0..1 — só varia no download em pedaços, que é o
 *   único longo o bastante pra precisar mostrar andamento.
 */
export async function baixarArquivoPreparado(
  preparado: PreparedDownload,
  onProgresso?: (fracao: number) => void,
): Promise<void> {
  if (preparado.fileDataUrl) {
    onProgresso?.(1)
    downloadDataUrl(preparado.fileName, preparado.fileDataUrl)
    return
  }

  const { token, totalChunks = 0, mime = 'application/octet-stream', fileName } = preparado
  if (!token || totalChunks < 1) throw new Error('Não foi possível baixar o arquivo.')

  const partes: string[] = []
  for (let i = 0; i < totalChunks; i++) {
    const { chunk } = await getDownloadChunk({ data: { token, index: i } })
    partes.push(chunk)
    onProgresso?.((i + 1) / totalChunks)
  }

  salvarBlob(fileName, base64ParaBlob(partes.join(''), mime))

  // Libera o rascunho temporário do servidor. Se falhar, não é problema do
  // aluno — ele já tem o arquivo.
  await finishChunkedDownload({ data: { token } }).catch(() => {})
}
