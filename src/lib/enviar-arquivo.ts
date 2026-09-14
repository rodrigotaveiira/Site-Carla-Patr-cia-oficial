import { startChunkedUpload, sendUploadChunk, abortChunkedUpload } from './upload-chunks'
import {
  CHUNKED_UPLOAD_THRESHOLD_BYTES, MAX_CHUNK_BYTES, contarPedacos,
} from './upload-limits'

// Lado do navegador do envio de arquivo.
//
// Arquivo pequeno vai de uma vez só, como sempre foi. Arquivo grande é partido
// em pedaços de 3MB e vai um por requisição, porque a Netlify recusa corpo
// acima de 6MB (ver #127).
//
// Por que 3MB e não 4: o pedaço tem que ser múltiplo de 3 bytes. Base64
// converte 3 bytes em 4 caracteres, então só assim os pedaços codificados
// podem ser emendados direto no servidor sem decodificar um por um. 3MB é
// divisível por 3; 4MB não seria.

export type ArquivoEnviado =
  | { modo: 'direto'; fileDataUrl: string }
  | { modo: 'pedacos'; uploadId: string; mime: string }

function lerComoDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Não foi possível ler o arquivo.'))
    reader.readAsDataURL(blob)
  })
}

/** Só o base64, sem o prefixo `data:<mime>;base64,`. */
function separarDataUrl(dataUrl: string): { mime: string; base64: string } {
  const virgula = dataUrl.indexOf(',')
  const cabecalho = dataUrl.slice(0, virgula)
  const mime = cabecalho.slice('data:'.length).replace(';base64', '') || 'application/octet-stream'
  return { mime, base64: dataUrl.slice(virgula + 1) }
}

/**
 * Envia o arquivo e devolve como se referir a ele na hora de publicar.
 *
 * @param onProgresso recebe 0..1 — só faz sentido no envio em pedaços, onde a
 *   espera é longa o bastante pra precisar mostrar andamento.
 */
export async function enviarArquivo(
  file: File,
  onProgresso?: (fracao: number) => void,
): Promise<ArquivoEnviado> {
  if (file.size <= CHUNKED_UPLOAD_THRESHOLD_BYTES) {
    onProgresso?.(0)
    const fileDataUrl = await lerComoDataUrl(file)
    onProgresso?.(1)
    return { modo: 'direto', fileDataUrl }
  }

  const totalChunks = contarPedacos(file.size)
  const { mime } = separarDataUrl(await lerComoDataUrl(file.slice(0, Math.min(file.size, 64))))
  const { uploadId } = await startChunkedUpload({ data: { totalChunks } })

  try {
    for (let i = 0; i < totalChunks; i++) {
      const pedaco = file.slice(i * MAX_CHUNK_BYTES, (i + 1) * MAX_CHUNK_BYTES)
      const { base64 } = separarDataUrl(await lerComoDataUrl(pedaco))
      await sendUploadChunk({ data: { uploadId, index: i, chunk: base64 } })
      onProgresso?.((i + 1) / totalChunks)
    }
  } catch (erro) {
    // Não deixa os pedaços já enviados ocupando espaço se o envio morreu no meio.
    await abortChunkedUpload({ data: { uploadId, totalChunks } }).catch(() => {})
    throw erro
  }

  return { modo: 'pedacos', uploadId, mime }
}
