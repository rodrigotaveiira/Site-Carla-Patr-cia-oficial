import { createServerFn } from '@tanstack/react-start'
import { getStore } from '@netlify/blobs'
import { z } from 'zod'
import { getServerUser } from './auth'

// Comprovação de autenticação recente pra marcar mentoria — no servidor.
//
// Antes, a senha pedida antes de agendar era conferida só no cliente
// (`reauth.ts` chamava `login()` do @netlify/identity e seguia): quem
// chamasse a server function de agendamento direto marcava sem senha nenhuma.
// Agora a senha é verificada AQUI, contra o Netlify Identity (GoTrue), e o
// resultado vira um marcador de "auth recente" com validade curta. A senha
// só vai pro endpoint de auth e é descartada — nada é armazenado.

const RECENT_AUTH_TTL_MS = 5 * 60 * 1000

function recentAuthStore() {
  return getStore({ name: 'recent-auth', consistency: 'strong' })
}

function identityTokenUrl(): string | null {
  const base = process.env.URL || process.env.DEPLOY_PRIME_URL || process.env.DEPLOY_URL
  if (!base) return null
  return `${base.replace(/\/+$/, '')}/.netlify/identity/token`
}

export const confirmSchedulingAuth = createServerFn({ method: 'POST' })
  .validator(z.object({ password: z.string().min(1).max(200) }))
  .handler(async ({ data }) => {
    const user = await getServerUser()
    if (!user?.email) throw new Error('Você precisa estar logado.')

    const url = identityTokenUrl()
    if (!url) {
      // Ambiente sem Netlify Identity (dev local): não dá pra verificar de
      // verdade, então não marca nada — o agendamento vai continuar pedindo
      // a confirmação. Em produção `URL` sempre existe.
      throw new Error('A confirmação de senha não está disponível neste ambiente.')
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'password',
        username: user.email,
        password: data.password,
      }),
    })
    if (!res.ok) throw new Error('Senha incorreta. Tente de novo.')

    await recentAuthStore().setJSON(user.email, { at: Date.now() })
    return { ok: true }
  })

/**
 * Exige que o aluno tenha confirmado a senha há pouco (via
 * `confirmSchedulingAuth`). Chamado dentro das server functions de
 * agendamento — fecha a brecha de marcar chamando o endpoint direto.
 */
export async function assertRecentAuth(user: { email?: string | null } | null | undefined): Promise<void> {
  if (!user?.email) throw new Error('Você precisa estar logado.')
  const record = (await recentAuthStore().get(user.email, { type: 'json' })) as { at: number } | null
  if (!record || Date.now() - record.at > RECENT_AUTH_TTL_MS) {
    throw new Error('Confirme sua senha para marcar o horário.')
  }
}
