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
