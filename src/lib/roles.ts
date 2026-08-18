// O pacote @netlify/identity pode devolver as roles em formatos diferentes
// dependendo da versão/contexto (snake_case ou camelCase, aninhado ou direto).
// Essa função procura em todos os lugares possíveis para não depender de um formato só.
export function userHasRole(user: unknown, role: string): boolean {
  const u = user as Record<string, any>
  const candidates: unknown[] = [
    u?.app_metadata?.roles,
    u?.appMetadata?.roles,
    u?.roles,
    u?.app_metadata?.role,
    u?.appMetadata?.role,
  ]
  const target = role.trim().toLowerCase()
  return candidates.some(
    (value) =>
      Array.isArray(value) &&
      value.some((item) => typeof item === 'string' && item.trim().toLowerCase() === target),
  )
}

// "admin" tem acesso total. "professor" tem acesso restrito (correção de redações,
// lembretes e dicas). Essa função identifica quem faz parte da equipe, dos dois tipos.
export function isStaff(user: unknown): boolean {
  return userHasRole(user, 'admin') || userHasRole(user, 'professor')
}

// Extrai nome completo e CPF do usuário, procurando nos formatos possíveis
// (snake_case ou camelCase) que o @netlify/identity pode devolver.
export function getStudentIdentity(user: unknown): { name: string; cpf: string } {
  const u = user as Record<string, any>
  const name =
    u?.user_metadata?.full_name ||
    u?.userMetadata?.full_name ||
    u?.name ||
    'Aluno'
  const cpf =
    u?.user_metadata?.cpf ||
    u?.userMetadata?.cpf ||
    u?.cpf ||
    ''
  return { name: String(name).trim(), cpf: String(cpf).trim() }
}
