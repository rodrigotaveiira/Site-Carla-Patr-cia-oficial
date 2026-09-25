import { createServerFn } from '@tanstack/react-start'
import { getStore } from '@netlify/blobs'
import { z } from 'zod'
import { getServerUser } from './auth'
import { userHasRole } from './roles'
import { boundedText, hhmm } from './schemas'

// A aula ao vivo é de segunda a sexta, sempre no mesmo horário — por isso o
// que a professora configura é só o horário (`time`), não uma data fixa. A
// data certa (hoje, ou o próximo dia útil) é calculada sozinha toda vez que
// alguém pede a aula, em vez de ficar guardada e foi o que precisava de
// edição manual todo santo dia antes disso.
export type LiveClass = {
  title: string
  module: string
  description: string
  time: string // "HH:MM", horário configurado (Brasília, sem conversão — ver lembrete-horario.ts)
  dateTime: string // "AAAA-MM-DDTHH:mm" da próxima ocorrência, já calculada — é o que o dashboard usa pra exibir
  durationMinutes: number
  zoomLink: string
  updatedAt: string
}

type LiveClassConfig = {
  title: string
  module: string
  description: string
  time: string
  durationMinutes: number
  zoomLink: string
  updatedAt: string
}

function liveClassStore() {
  return getStore({ name: 'live-class', consistency: 'strong' })
}

/** Segunda a sexta: 1 a 5 no `getDay()` (0 = domingo, 6 = sábado). */
function ehDiaDeAula(data: Date): boolean {
  const diaDaSemana = data.getDay()
  return diaDaSemana >= 1 && diaDaSemana <= 5
}

/**
 * Próxima ocorrência da aula a partir de `agora`: hoje, se ainda for dia de
 * aula e o horário não tiver passado — senão o próximo dia de aula, pulando
 * fim de semana.
 */
function proximaOcorrencia(horario: string, agora: Date): Date {
  const [hora, minuto] = horario.split(':').map(Number)
  const candidata = new Date(agora)
  candidata.setHours(hora, minuto, 0, 0)

  if (candidata.getTime() <= agora.getTime() || !ehDiaDeAula(candidata)) {
    do {
      candidata.setDate(candidata.getDate() + 1)
    } while (!ehDiaDeAula(candidata))
  }

  return candidata
}

function paraDateTimeLocal(data: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${data.getFullYear()}-${pad(data.getMonth() + 1)}-${pad(data.getDate())}T${pad(data.getHours())}:${pad(data.getMinutes())}`
}

/**
 * Extrai o horário de um registro salvo antes desta mudança, que guardava
 * uma data e hora fixas (`dateTime`) em vez de só o horário recorrente. Sem
 * isso, quem já tinha uma aula configurada ficaria sem nada no primeiro
 * `getLiveClass` depois do deploy.
 */
function horarioLegado(registro: Record<string, unknown>): string | null {
  const dateTime = registro.dateTime
  if (typeof dateTime !== 'string') return null
  const match = dateTime.match(/T(\d{2}:\d{2})/)
  return match ? match[1] : null
}

// Qualquer aluno logado vê a próxima aula ao vivo configurada (ou null, se nada foi agendado ainda).
export const getLiveClass = createServerFn({ method: 'GET' }).handler(async (): Promise<LiveClass | null> => {
  const user = await getServerUser()
  if (!user || (!userHasRole(user, 'aprovado') && !userHasRole(user, 'admin'))) {
    throw new Error('Acesso negado.')
  }

  const store = liveClassStore()
  const registro = (await store.get('current', { type: 'json' })) as
    | (Partial<LiveClassConfig> & { dateTime?: string })
    | null
  if (!registro) return null

  const horario = registro.time ?? horarioLegado(registro)
  if (!horario) return null

  return {
    title: registro.title ?? '',
    module: registro.module ?? 'Aula ao vivo',
    description: registro.description ?? '',
    time: horario,
    dateTime: paraDateTimeLocal(proximaOcorrencia(horario, new Date())),
    durationMinutes: registro.durationMinutes ?? 60,
    zoomLink: registro.zoomLink ?? '',
    updatedAt: registro.updatedAt ?? '',
  }
})

export const updateLiveClass = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      title: boundedText(200),
      module: z.string().trim().max(120),
      description: z.string().trim().max(5000),
      time: hhmm,
      durationMinutes: z.coerce.number().int().min(5).max(600),
      zoomLink: z
        .union([z.url().refine((v) => /^https?:\/\//i.test(v), 'O link do Zoom não parece válido.'), z.literal('')])
        .transform((v) => v ?? ''),
    }),
  )
  .handler(async ({ data }) => {
    const user = await getServerUser()
    if (!user || !userHasRole(user, 'admin')) throw new Error('Acesso negado.')

    const store = liveClassStore()
    const config: LiveClassConfig = {
      title: data.title.trim(),
      module: data.module.trim() || 'Aula ao vivo',
      description: data.description.trim(),
      time: data.time,
      durationMinutes: Number(data.durationMinutes) || 60,
      zoomLink: data.zoomLink.trim(),
      updatedAt: new Date().toISOString(),
    }
    await store.setJSON('current', config)
    return config
  })
