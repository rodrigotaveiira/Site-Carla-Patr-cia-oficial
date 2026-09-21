import { getStore } from '@netlify/blobs'
import { getStudentIdentity } from './roles'

export type IdentidadeCadastro = { name: string; cpf: string }

function identidadeCadastroStore() {
  return getStore({ name: 'identidade-cadastro', consistency: 'strong' })
}

// Nome e CPF usados na marca d'água dos arquivos protegidos (materiais,
// conteúdo, provas de simulado) não podem depender de `user_metadata.full_name`
// puro — esse campo é o mesmo que o aluno edita a qualquer momento em
// `/perfil`. Sem essa trava, um aluno podia trocar o nome antes de baixar um
// arquivo pra "limpar" a marca d'água que identifica quem vazou o conteúdo.
//
// Trava nome+CPF no primeiro download protegido que vemos daquele e-mail
// (com `onlyIfNew`, então nem uma chamada legítima futura sobrescreve) e
// sempre devolve esse valor travado dali em diante, ignorando qualquer troca
// de nome posterior no perfil. Contas que já existiam antes desta trava
// entrar no ar travam a partir do nome que tinham no primeiro download após
// o deploy — não há como recuperar retroativamente o nome exato do cadastro
// original, já que `user_metadata` sempre foi sobrescrito em cada edição.
export async function getRegisteredIdentity(user: unknown): Promise<IdentidadeCadastro> {
  const email = String((user as Record<string, any>)?.email || '').toLowerCase().trim()
  const atual = getStudentIdentity(user)
  if (!email) return atual

  const store = identidadeCadastroStore()
  const travada = (await store.get(email, { type: 'json' })) as IdentidadeCadastro | null
  if (travada) return travada

  await store.setJSON(email, atual, { onlyIfNew: true })
  return atual
}
