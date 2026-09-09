import { createServerFn } from '@tanstack/react-start'
import { getStore } from '@netlify/blobs'
import { getServerUser } from './auth'
import { isStaff } from './roles'

export type AdminNotificationCounts = {
  recadosNaoLidos: number
  redacoesPendentes: number
}

// Contagem pros selos dos cards do painel admin/professor (Recados dos
// alunos, Correção de redações) — só o número, não a lista inteira, pra não
// puxar dado pesado (redação carrega até o arquivo original em alguns
// registros antigos) só pra mostrar um badge. Cada seção é isolada em
// try/catch pra um problema numa não derrubar a contagem da outra.
export const getAdminNotificationCounts = createServerFn({ method: 'GET' }).handler(
  async (): Promise<AdminNotificationCounts> => {
    const user = await getServerUser()
    if (!user || !isStaff(user)) throw new Error('Acesso negado.')

    let recadosNaoLidos = 0
    try {
      const store = getStore({ name: 'student-recados', consistency: 'strong' })
      const { blobs } = await store.list()
      for (const blob of blobs) {
        try {
          const value = (await store.get(blob.key, { type: 'json' })) as { read?: boolean } | null
          if (value && !value.read) recadosNaoLidos++
        } catch (error) {
          console.error(`Contagem admin: falha ao ler recado "${blob.key}":`, error)
        }
      }
    } catch (error) {
      console.error('Contagem admin: falha ao listar recados:', error)
    }

    let redacoesPendentes = 0
    try {
      const store = getStore({ name: 'redacoes-submissions', consistency: 'strong' })
      const { blobs } = await store.list()
      for (const blob of blobs) {
        try {
          const value = (await store.get(blob.key, { type: 'json' })) as { status?: string } | null
          if (value && value.status === 'pendente') redacoesPendentes++
        } catch (error) {
          console.error(`Contagem admin: falha ao ler redação "${blob.key}":`, error)
        }
      }
    } catch (error) {
      console.error('Contagem admin: falha ao listar redações:', error)
    }

    return { recadosNaoLidos, redacoesPendentes }
  },
)
