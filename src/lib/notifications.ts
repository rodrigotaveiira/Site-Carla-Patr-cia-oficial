import { createServerFn } from '@tanstack/react-start'
import { getStore } from '@netlify/blobs'
import { getServerUser } from './auth'
import { userHasRole } from './roles'
import { CONTENT_SECTIONS, type ContentSection } from './content-library'
import { releaseInstantMs } from './materials'

export type ContentNotification = {
  id: string
  text: string
  date: string
}

const RECENT_WINDOW_DAYS = 7

// Avisa o aluno sobre arquivos novos ou recém-liberados em qualquer seção
// (Materiais, Biblioteca, Questões, Simulados, Repertórios, Dicas), dos últimos 7 dias.
// Para Materiais, considera a data em que o arquivo foi liberado (não a de envio),
// já que um material pode ter sido enviado há semanas mas só liberado agora.
export const getRecentContentNotifications = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await getServerUser()
  if (!user || (!userHasRole(user, 'aprovado') && !userHasRole(user, 'admin'))) {
    throw new Error('Acesso negado.')
  }

  const now = Date.now()
  const notifications: ContentNotification[] = []

  // Materiais: usa o instante de liberação (15min antes da aula) quando definido.
  const materialsStore = getStore({ name: 'student-materials', consistency: 'strong' })
  const { blobs: materialBlobs } = await materialsStore.list()
  for (const blob of materialBlobs) {
    const value = (await materialsStore.get(blob.key, { type: 'json' })) as
      | { title: string; createdAt: string; classDate: string | null; classTime: string | null }
      | null
    if (!value) continue

    const releaseAt = releaseInstantMs(value.classDate, value.classTime)
    const referenceDate = releaseAt !== null ? new Date(releaseAt) : new Date(value.createdAt)
    if (referenceDate.getTime() > now) continue // ainda não liberado — não avisa

    const daysAgo = (now - referenceDate.getTime()) / (1000 * 60 * 60 * 24)
    if (daysAgo <= RECENT_WINDOW_DAYS) {
      notifications.push({
        id: `material-${blob.key}`,
        text: `Novo material disponível: "${value.title}"`,
        date: referenceDate.toISOString(),
      })
    }
  }

  // Bibliotecas de PDF (Biblioteca, Questões, Simulados, Repertórios, Dicas).
  for (const section of Object.keys(CONTENT_SECTIONS) as ContentSection[]) {
    const store = getStore({ name: `content-library-${section}`, consistency: 'strong' })
    const { blobs } = await store.list()
    for (const blob of blobs) {
      const value = (await store.get(blob.key, { type: 'json' })) as { title: string; createdAt: string } | null
      if (!value) continue
      const daysAgo = (now - new Date(value.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      if (daysAgo <= RECENT_WINDOW_DAYS) {
        notifications.push({
          id: `${section}-${blob.key}`,
          text: `Novo arquivo em ${CONTENT_SECTIONS[section]}: "${value.title}"`,
          date: value.createdAt,
        })
      }
    }
  }

  notifications.sort((a, b) => b.date.localeCompare(a.date))
  return notifications.slice(0, 5)
})
