import { createServerFn } from '@tanstack/react-start'
import { getStore } from '@netlify/blobs'
import { z } from 'zod'
import { getServerUser } from './auth'
import { isStaff, userHasRole } from './roles'

// Um único interruptor pra pausar os avisos AUTOMÁTICOS de "conteúdo novo"
// (material, mentoria, item de biblioteca/repertórios/dicas/etc.) — pensado
// pra professora poder inserir vários itens em sequência sem disparar um
// e-mail pra turma toda a cada um, e não estourar a cota diária do Resend.
//
// Não afeta os envios manuais e deliberados (Mensagem para os alunos,
// Convite pras mentorias) nem os avisos transacionais de um aluno só
// (redação corrigida, confirmação de agendamento, recado respondido) — esses
// continuam sempre ativos, de propósito. Ver notificar-material.ts,
// notificar-conteudo.ts e notificar-mentoria.ts, que checam este interruptor.
function notificationSettingsStore() {
  return getStore({ name: 'notification-settings', consistency: 'strong' })
}

/**
 * Usado pelos notificadores automáticos. Nunca lança — se não der pra ler a
 * configuração, assume ativo (mesmo comportamento de sempre) em vez de travar
 * o aviso por causa de uma falha no interruptor.
 */
export async function avisosDeNovidadeEstaoAtivos(): Promise<boolean> {
  try {
    const pausado = await notificationSettingsStore().get('pausado', { type: 'json' })
    return pausado !== true
  } catch (error) {
    console.error('Não foi possível ler a configuração de avisos — assumindo ativo:', error)
    return true
  }
}

export const getAvisosDeNovidade = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await getServerUser()
  if (!user || !isStaff(user)) throw new Error('Acesso negado.')
  return { ativo: await avisosDeNovidadeEstaoAtivos() }
})

export const setAvisosDeNovidade = createServerFn({ method: 'POST' })
  .validator(z.object({ ativo: z.boolean() }))
  .handler(async ({ data }) => {
    const user = await getServerUser()
    if (!user || !userHasRole(user, 'admin')) throw new Error('Acesso negado.')
    await notificationSettingsStore().setJSON('pausado', !data.ativo)
    return { ativo: data.ativo }
  })
