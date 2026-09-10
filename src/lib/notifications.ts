import { createServerFn } from '@tanstack/react-start'
import { getStore } from '@netlify/blobs'
import { getServerUser } from './auth'
import { userHasRole } from './roles'
import { CONTENT_SECTIONS, type ContentSection } from './content-library'
import { releaseInstantMs } from './materials'
import { releaseInstantMs as simuladoReleaseInstantMs } from './simulado-release'
import { formatarHora } from './formato'
import { instanteInicioDoDiaSimulado, instanteInicioSimulado, instanteLembreteVespera } from './lembrete-simulado-horario'

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
  // Cada item é isolado em try/catch: um blob legado/corrompido não pode derrubar
  // o aviso dos demais materiais (nem dos itens de biblioteca, coletados depois).
  try {
    const materialsStore = getStore({ name: 'student-materials', consistency: 'strong' })
    const { blobs: materialBlobs } = await materialsStore.list()
    for (const blob of materialBlobs) {
      try {
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
      } catch (error) {
        console.error(`Aviso: falha ao ler material "${blob.key}" para o sino de avisos:`, error)
      }
    }
  } catch (error) {
    console.error('Aviso: falha ao listar materiais para o sino de avisos:', error)
  }

  // Bibliotecas de PDF (Biblioteca, Questões, Simulados, Repertórios, Dicas, Gabaritos).
  for (const section of Object.keys(CONTENT_SECTIONS) as ContentSection[]) {
    try {
      const store = getStore({ name: `content-library-${section}`, consistency: 'strong' })
      const { blobs } = await store.list()
      for (const blob of blobs) {
        try {
          const value = (await store.get(blob.key, { type: 'json' })) as { title: string; createdAt: string } | null
          if (!value) continue
          const createdAtMs = new Date(value.createdAt).getTime()
          if (createdAtMs > now) continue // data futura (dado inconsistente) — não avisa
          const daysAgo = (now - createdAtMs) / (1000 * 60 * 60 * 24)
          if (daysAgo <= RECENT_WINDOW_DAYS) {
            notifications.push({
              id: `${section}-${blob.key}`,
              text: `Novo arquivo em ${CONTENT_SECTIONS[section]}: "${value.title}"`,
              date: value.createdAt,
            })
          }
        } catch (error) {
          console.error(`Aviso: falha ao ler arquivo "${blob.key}" de ${section} para o sino de avisos:`, error)
        }
      }
    } catch (error) {
      console.error(`Aviso: falha ao listar a seção ${section} para o sino de avisos:`, error)
    }
  }

  // Redações corrigidas do próprio aluno (não de todo mundo, ao contrário
  // dos itens acima — por isso filtra por studentEmail).
  try {
    const store = getStore({ name: 'redacoes-submissions', consistency: 'strong' })
    const { blobs } = await store.list()
    for (const blob of blobs) {
      try {
        const value = (await store.get(blob.key, { type: 'json' })) as
          | { studentEmail: string; title: string; status: string; correctedAt: string | null }
          | null
        if (!value || value.studentEmail !== user.email || value.status !== 'corrigida' || !value.correctedAt) continue

        const correctedAtMs = new Date(value.correctedAt).getTime()
        if (correctedAtMs > now) continue // data futura (dado inconsistente) — não avisa
        const daysAgo = (now - correctedAtMs) / (1000 * 60 * 60 * 24)
        if (daysAgo <= RECENT_WINDOW_DAYS) {
          notifications.push({
            id: `redacao-corrigida-${blob.key}`,
            text: `Sua redação "${value.title}" foi corrigida`,
            date: value.correctedAt,
          })
        }
      } catch (error) {
        console.error(`Aviso: falha ao ler redação "${blob.key}" para o sino de avisos:`, error)
      }
    }
  } catch (error) {
    console.error('Aviso: falha ao listar redações para o sino de avisos:', error)
  }

  // Recados respondidos do próprio aluno.
  try {
    const store = getStore({ name: 'student-recados', consistency: 'strong' })
    const { blobs } = await store.list()
    for (const blob of blobs) {
      try {
        const value = (await store.get(blob.key, { type: 'json' })) as
          | { studentEmail: string; reply: string | null; repliedAt: string | null }
          | null
        if (!value || value.studentEmail !== user.email || !value.reply || !value.repliedAt) continue

        const repliedAtMs = new Date(value.repliedAt).getTime()
        if (repliedAtMs > now) continue // data futura (dado inconsistente) — não avisa
        const daysAgo = (now - repliedAtMs) / (1000 * 60 * 60 * 24)
        if (daysAgo <= RECENT_WINDOW_DAYS) {
          notifications.push({
            id: `recado-respondido-${blob.key}`,
            text: 'A Carla respondeu seu recado',
            date: value.repliedAt,
          })
        }
      } catch (error) {
        console.error(`Aviso: falha ao ler recado "${blob.key}" para o sino de avisos:`, error)
      }
    }
  } catch (error) {
    console.error('Aviso: falha ao listar recados para o sino de avisos:', error)
  }

  // Novas "Questões para treino" que acabaram de liberar (últimos 7 dias). A
  // data do aviso é o instante de liberação (ou a criação, quando libera na
  // hora) — fixo e no passado, então o ponto do sino se comporta como nos demais.
  try {
    const store = getStore({ name: 'simulados', consistency: 'strong' })
    const { blobs } = await store.list()
    for (const blob of blobs) {
      try {
        const value = (await store.get(blob.key, { type: 'json' })) as
          | { title: string; createdAt: string; releaseDate?: string; releaseTime?: string }
          | null
        if (!value) continue
        const releasedAtMs = simuladoReleaseInstantMs(value) ?? new Date(value.createdAt).getTime()
        if (releasedAtMs > now) continue // ainda não liberado
        const daysAgo = (now - releasedAtMs) / (1000 * 60 * 60 * 24)
        if (daysAgo <= RECENT_WINDOW_DAYS) {
          notifications.push({
            id: `questoes-treino-${blob.key}`,
            text: `Novas questões para treino: "${value.title}"`,
            date: new Date(releasedAtMs).toISOString(),
          })
        }
      } catch (error) {
        console.error(`Aviso: falha ao ler o conjunto "${blob.key}" para o sino de avisos:`, error)
      }
    }
  } catch (error) {
    console.error('Aviso: falha ao listar questões para treino para o sino de avisos:', error)
  }

  // Simulado/simuladão (e a correção dele) chegando: entra no sino a partir das
  // 18h da véspera (mesmo instante do primeiro lembrete por e-mail) e some
  // quando começa. A data do aviso é esse instante de véspera — fixo e no
  // passado depois de disparado, então o ponto do sino se comporta como nos demais.
  try {
    const store = getStore({ name: 'calendar-events', consistency: 'strong' })
    const { blobs } = await store.list()
    for (const blob of blobs) {
      try {
        const value = (await store.get(blob.key, { type: 'json' })) as
          | {
              type: string
              title: string
              date: string
              time: string
              correction?: { date: string; time: string; description: string } | null
            }
          | null
        if (!value || (value.type !== 'simulado' && value.type !== 'simuladao')) continue

        const rotulo = value.type === 'simuladao' ? 'Simuladão' : 'Simulado'
        const alvos: Array<{ id: string; rotulo: string; titulo: string; date: string; time: string }> = [
          { id: blob.key, rotulo, titulo: value.title, date: value.date, time: value.time },
        ]
        if (value.correction?.date) {
          alvos.push({
            id: `${blob.key}-correcao`,
            rotulo: `Correção do ${rotulo.toLowerCase()}`,
            titulo: value.correction.description?.trim() || value.title,
            date: value.correction.date,
            time: value.correction.time || '',
          })
        }

        for (const alvo of alvos) {
          const inicioMs = instanteInicioSimulado(alvo.date, alvo.time)
          const avisoDesdeMs = instanteLembreteVespera(alvo.date)
          if (now < avisoDesdeMs || now >= inicioMs) continue

          const quando = now >= instanteInicioDoDiaSimulado(alvo.date) ? 'hoje' : 'amanhã'
          const hora = alvo.time ? ` às ${formatarHora(alvo.time)}` : ''
          notifications.push({
            id: `simulado-proximo-${alvo.id}`,
            text: `${alvo.rotulo} ${quando}${hora}: "${alvo.titulo}"`,
            date: new Date(avisoDesdeMs).toISOString(),
          })
        }
      } catch (error) {
        console.error(`Aviso: falha ao ler evento "${blob.key}" para o sino de avisos:`, error)
      }
    }
  } catch (error) {
    console.error('Aviso: falha ao listar a agenda para o sino de avisos:', error)
  }

  notifications.sort((a, b) => b.date.localeCompare(a.date))
  return notifications.slice(0, 5)
})
