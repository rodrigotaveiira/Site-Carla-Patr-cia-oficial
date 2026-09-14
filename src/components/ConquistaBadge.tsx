// Selo de conquista: o mesmo componente desenha a medalha desbloqueada, a
// bloqueada (com cadeado) e a misteriosa (sem revelar nome nem prêmio).
// Usado na área "Minhas Conquistas" e no card de meta semanal do dashboard.

import {
  Award, BadgeCheck, Brain, BookOpenCheck, CalendarCheck2, Crosshair, Crown, Flame, Gem,
  HelpCircle, Hourglass, Layers, Lock, Medal, ShieldCheck, Sparkles, Star, Target, TrendingUp, Trophy,
} from 'lucide-react'
import { CONQUISTA_MISTERIOSA, RARIDADES, type Conquista, type IconeConquista } from '@/lib/conquistas-catalogo'

const ICONES: Record<IconeConquista, typeof Trophy> = {
  chama: Flame,
  trofeu: Trophy,
  alvo: Target,
  medalha: Medal,
  coroa: Crown,
  diamante: Gem,
  estrela: Star,
  livro: BookOpenCheck,
  mira: Crosshair,
  calendario: CalendarCheck2,
  ampulheta: Hourglass,
  cerebro: Brain,
  subindo: TrendingUp,
  camadas: Layers,
  escudo: ShieldCheck,
  selo: BadgeCheck,
  faisca: Sparkles,
  louros: Award,
}

export function IconeDaConquista({ icone, size = 22 }: { icone: IconeConquista; size?: number }) {
  const Icone = ICONES[icone] ?? Trophy
  return <Icone size={size} />
}

function formatarData(iso: string) {
  const data = new Date(iso)
  if (Number.isNaN(data.getTime())) return null
  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

type Props = {
  conquista: Conquista
  desbloqueada: boolean
  // Data ISO do desbloqueio, quando houver.
  em?: string
  // Linha extra de progresso pro aluno saber o quanto falta ("40 de 100 questões").
  progresso?: string
  // Acabou de sair: ganha um brilho discreto na coleção.
  nova?: boolean
}

export function ConquistaBadge({ conquista, desbloqueada, em, progresso, nova }: Props) {
  // Misteriosa continua escondida até ser desbloqueada — é o que cria a curiosidade.
  const oculta = !desbloqueada && conquista.misteriosa
  const nome = oculta ? CONQUISTA_MISTERIOSA.nome : conquista.nome
  const detalhe = desbloqueada ? conquista.mensagem : conquista.requisito
  const data = desbloqueada && em ? formatarData(em) : null

  const classes = [
    'conquista-badge',
    `raridade-${conquista.raridade}`,
    desbloqueada ? 'desbloqueada' : 'bloqueada',
    oculta ? 'misteriosa' : '',
    nova ? 'nova' : '',
  ].filter(Boolean).join(' ')

  return (
    <article className={classes}>
      <span className="conquista-selo" aria-hidden="true">
        {oculta ? <HelpCircle size={22} /> : <IconeDaConquista icone={conquista.icone} />}
        {!desbloqueada && !oculta && <i className="conquista-cadeado"><Lock size={11} /></i>}
      </span>
      <div className="conquista-texto">
        <b>{nome}</b>
        <p>{detalhe}</p>
        {/* A raridade fica no rodapé, junto do progresso: no topo ela roubava
            largura do nome e quebrava títulos curtos em duas linhas. */}
        <div className="conquista-rodape">
          <span className="conquista-raridade">{RARIDADES[conquista.raridade].nome}</span>
          {progresso && !desbloqueada && <small className="conquista-progresso">{progresso}</small>}
          {data && <small className="conquista-data">Conquistada em {data}</small>}
        </div>
      </div>
    </article>
  )
}
