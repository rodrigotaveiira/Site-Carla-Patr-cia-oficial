// Validação de upload pelo CONTEÚDO, não pelo nome do arquivo.
//
// O que o cliente manda é uma data URL (`data:<mime>;base64,<payload>`). Sozinho,
// nada disso é confiável: a extensão no nome, o mime no prefixo e o payload são
// todos escolhidos por quem envia. Estas funções conferem:
//   - o base64 é válido de verdade (decodifica e volta a codificar igual);
//   - o tamanho já decodificado está dentro do limite (não o tamanho da string);
//   - os primeiros bytes (assinatura do formato) batem com o tipo alegado;
//   - para .docx (que é um zip), o conteúdo do zip não é uma "bomba" que
//     estoura a memória ao descompactar.

export type UploadKind = 'image' | 'pdf' | 'docx' | 'doc'

const DATA_URL_RE = /^data:([a-z0-9.+-]+\/[a-z0-9.+-]+)?(;charset=[a-z0-9-]+)?;base64,([A-Za-z0-9+/]*={0,2})$/i

export type ParsedUpload = {
  mime: string
  bytes: Buffer
}

/**
 * Decodifica e valida a data URL. Lança Error (mensagem pronta pro aluno)
 * quando o base64 é inválido ou o arquivo passa do tamanho máximo.
 */
export function parseDataUrl(dataUrl: string, maxDecodedBytes: number): ParsedUpload {
  if (typeof dataUrl !== 'string' || dataUrl.length === 0) {
    throw new Error('Arquivo inválido.')
  }
  const match = dataUrl.match(DATA_URL_RE)
  if (!match) {
    throw new Error('Arquivo inválido: não reconheci o formato do envio.')
  }
  const mime = (match[1] ?? '').toLowerCase()
  const payload = match[3] ?? ''

  let bytes: Buffer
  try {
    bytes = Buffer.from(payload, 'base64')
  } catch {
    throw new Error('Arquivo inválido: os dados enviados estão corrompidos.')
  }
  // `Buffer.from(..., 'base64')` ignora caracteres inválidos em silêncio; um
  // roundtrip pega isso. `payload` já passou pelo regex acima (só base64),
  // então a diferença aqui denuncia padding/comprimento errados.
  if (bytes.length === 0 || bytes.toString('base64').replace(/=+$/, '') !== payload.replace(/=+$/, '')) {
    throw new Error('Arquivo inválido: os dados enviados estão corrompidos.')
  }
  if (bytes.length > maxDecodedBytes) {
    const mb = Math.floor(maxDecodedBytes / (1024 * 1024))
    throw new Error(`Esse arquivo é muito grande. Envie um arquivo de até ${mb}MB.`)
  }
  return { mime, bytes }
}

function hasPrefix(bytes: Buffer, sig: number[], offset = 0): boolean {
  if (bytes.length < offset + sig.length) return false
  return sig.every((b, i) => bytes[offset + i] === b)
}

/** Descobre o tipo real a partir dos primeiros bytes (magic number). */
export function sniffKind(bytes: Buffer): UploadKind | null {
  if (hasPrefix(bytes, [0xff, 0xd8, 0xff])) return 'image' // JPEG
  if (hasPrefix(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image' // PNG
  if (hasPrefix(bytes, [0x47, 0x49, 0x46, 0x38])) return 'image' // GIF8
  // WEBP: "RIFF"...."WEBP"
  if (hasPrefix(bytes, [0x52, 0x49, 0x46, 0x46]) && hasPrefix(bytes, [0x57, 0x45, 0x42, 0x50], 8)) return 'image'
  if (hasPrefix(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) return 'pdf' // "%PDF-"
  if (hasPrefix(bytes, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) return 'doc' // OLE2 (.doc antigo)
  // ZIP local file header — pode ser .docx (ou .xlsx, .odt, .zip...). A checagem
  // de que é MESMO um Office Open XML de Word fica em `assertSafeDocx`.
  if (hasPrefix(bytes, [0x50, 0x4b, 0x03, 0x04]) || hasPrefix(bytes, [0x50, 0x4b, 0x05, 0x06])) return 'docx'
  return null
}

const EXTENSION_KIND: Record<string, UploadKind> = {
  '.jpg': 'image', '.jpeg': 'image', '.png': 'image', '.webp': 'image', '.gif': 'image',
  '.pdf': 'pdf', '.docx': 'docx', '.doc': 'doc',
}

/**
 * Confere que o conteúdo bate com a extensão do nome e está entre os tipos
 * permitidos. Retorna o tipo real detectado.
 */
export function assertKindMatches(bytes: Buffer, fileName: string, allowed: UploadKind[]): UploadKind {
  const dot = fileName.lastIndexOf('.')
  const ext = dot >= 0 ? fileName.slice(dot).toLowerCase() : ''
  const claimed = EXTENSION_KIND[ext]
  if (!claimed || !allowed.includes(claimed)) {
    throw new Error('Tipo de arquivo não aceito.')
  }
  const actual = sniffKind(bytes)
  if (!actual) {
    throw new Error('Arquivo inválido: o conteúdo não corresponde a nenhum formato aceito.')
  }
  // `.doc` antigo e `.docx` são coisas diferentes; imagem tem que ser imagem.
  if (actual !== claimed) {
    throw new Error(`Esse arquivo não é um ${ext.slice(1).toUpperCase()} de verdade. Verifique o arquivo e tente de novo.`)
  }
  if (!allowed.includes(actual)) {
    throw new Error('Tipo de arquivo não aceito.')
  }
  return actual
}

// Lê o "End of Central Directory" + "Central Directory" de um zip, sem
// descompactar nada, pra medir o custo de abrir o arquivo antes de abrir.
type ZipStats = { entryCount: number; totalUncompressed: number; maxRatio: number; hasWordDocument: boolean }

function readZipStats(bytes: Buffer): ZipStats | null {
  const EOCD_SIG = 0x06054b50
  // O EOCD tem no mínimo 22 bytes e fica no fim (com até 65535 bytes de comentário).
  const minEocd = 22
  const searchStart = Math.max(0, bytes.length - (minEocd + 0xffff))
  let eocd = -1
  for (let i = bytes.length - minEocd; i >= searchStart; i--) {
    if (bytes.readUInt32LE(i) === EOCD_SIG) { eocd = i; break }
  }
  if (eocd < 0) return null

  const entryCount = bytes.readUInt16LE(eocd + 10)
  const cdOffset = bytes.readUInt32LE(eocd + 16)
  if (cdOffset >= bytes.length) return null

  const CDH_SIG = 0x02014b50
  let p = cdOffset
  let totalUncompressed = 0
  let maxRatio = 0
  let hasWordDocument = false

  for (let n = 0; n < entryCount; n++) {
    if (p + 46 > bytes.length || bytes.readUInt32LE(p) !== CDH_SIG) return null
    const compressed = bytes.readUInt32LE(p + 20)
    const uncompressed = bytes.readUInt32LE(p + 24)
    const nameLen = bytes.readUInt16LE(p + 28)
    const extraLen = bytes.readUInt16LE(p + 30)
    const commentLen = bytes.readUInt16LE(p + 32)
    const name = bytes.toString('utf8', p + 46, p + 46 + nameLen)
    if (name === 'word/document.xml') hasWordDocument = true
    totalUncompressed += uncompressed
    if (compressed > 0) maxRatio = Math.max(maxRatio, uncompressed / compressed)
    p += 46 + nameLen + extraLen + commentLen
  }

  return { entryCount, totalUncompressed, maxRatio, hasWordDocument }
}

const DOCX_MAX_ENTRIES = 512
const DOCX_MAX_TOTAL_UNCOMPRESSED = 80 * 1024 * 1024 // 80MB descompactado no total
const DOCX_MAX_RATIO = 200 // relação descompactado/compactado por entrada

/**
 * Garante que o .docx é um zip são: é mesmo um documento do Word e não
 * descompacta pra um tamanho absurdo (zip bomb). Roda ANTES de qualquer
 * `JSZip.loadAsync` / `.async()`.
 */
export function assertSafeDocx(bytes: Buffer): void {
  const stats = readZipStats(bytes)
  if (!stats) {
    throw new Error('Arquivo Word inválido ou corrompido.')
  }
  if (!stats.hasWordDocument) {
    throw new Error('Esse arquivo não é um documento do Word (.docx) válido.')
  }
  if (stats.entryCount > DOCX_MAX_ENTRIES) {
    throw new Error('Arquivo Word inválido: estrutura interna suspeita.')
  }
  if (stats.totalUncompressed > DOCX_MAX_TOTAL_UNCOMPRESSED || stats.maxRatio > DOCX_MAX_RATIO) {
    throw new Error('Arquivo Word inválido: conteúdo interno grande demais.')
  }
}

/**
 * Validação completa de um upload de data URL: base64 + tamanho + assinatura
 * + (se for docx) segurança do zip. Devolve os bytes já decodificados, caso
 * quem chamou precise deles.
 */
export function validateUpload(opts: {
  dataUrl: string
  fileName: string
  allowed: UploadKind[]
  maxDecodedBytes: number
}): ParsedUpload {
  const parsed = parseDataUrl(opts.dataUrl, opts.maxDecodedBytes)
  const kind = assertKindMatches(parsed.bytes, opts.fileName, opts.allowed)
  if (kind === 'docx') assertSafeDocx(parsed.bytes)
  return parsed
}
