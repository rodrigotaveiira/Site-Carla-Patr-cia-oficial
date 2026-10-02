import { getStore } from '@netlify/blobs'

// Registro como fica gravado no blob — com a foto em base64. Só o servidor vê
// esse formato; pro navegador sai ApprovedStudent (aprovados.ts), com a URL da
// foto no lugar do base64.
export type StoredApprovedStudent = {
  id: string
  name: string
  university: string
  course: string // pode ficar vazio (opcional no cadastro)
  year: string // ano de aprovação (ex.: "2026") — opcional, usado pra ordenar a galeria
  quote: string // depoimento curto, opcional
  photoFileName: string
  photoDataUrl: string // base64 — já redimensionada/comprimida no navegador antes do envio
  createdAt: string
}

export function aprovadosStore() {
  return getStore({ name: 'aprovados-galeria', consistency: 'strong' })
}

// Formato dos ids gerados em addAprovado: `${Date.now()}-${6 caracteres}`.
const ID_PATTERN = /^\d{10,16}-[a-z0-9]{1,12}$/

// Só formatos raster. SVG fica de fora de propósito: servido do nosso próprio
// domínio, um SVG com <script> rodaria como página do site.
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp'])

/** Lê a foto de um aprovado e devolve os bytes prontos pra servir, ou null. */
export async function lerFotoAprovado(id: string): Promise<{ mime: string; bytes: Uint8Array<ArrayBuffer> } | null> {
  if (!ID_PATTERN.test(id)) return null
  const item = await aprovadosStore().get(id, { type: 'json' }) as StoredApprovedStudent | null
  if (!item?.photoDataUrl) return null

  const match = /^data:([a-z/+.-]+);base64,(.+)$/s.exec(item.photoDataUrl)
  if (!match || !ALLOWED_MIME.has(match[1])) return null
  return { mime: match[1], bytes: new Uint8Array(Buffer.from(match[2], 'base64')) }
}
