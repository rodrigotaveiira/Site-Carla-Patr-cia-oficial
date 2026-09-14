import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { CalendarCheck2, ChevronRight, Flame, Lock, Sparkles, Target, Trophy } from 'lucide-react'
import { useEffect, useState } from 'react'
import { readLocalUser } from '@/lib/identity-context'
import { getServerUser } from '@/lib/auth'
import { userHasRole, isStaff } from '@/lib/roles'
import {
  getMyAchievements, markAchievementsSeen, META_AULAS, META_QUESTOES,
  type EstadoConquistas, type ProximaConquista,
} from '@/lib/conquistas'
import {
  CONQUISTA_MISTERIOSA, ESPECIAIS, JORNADA_SEMANAL, SEQUENCIAS,
  conquistaPorId, type Conquista,
} from '@/lib/conquistas-catalogo'
import { getStudentProgress, type StudentProgress } from '@/lib/progress'
import { ConquistaBadge, IconeDaConquista } from '@/components/ConquistaBadge'

export const Route = createFileRoute('/_app/conquistas')({
  beforeLoad: async () => {
    if (typeof window !== 'undefined') {
      const localUser = readLocalUser()
      if (localUser) return { user: localUser }
    }

    const user = await getServerUser()
    if (!user) throw redirect({ to: '/login' })
    // `debug` é opcional na tela de espera — vai `undefined` pra não sujar a URL.
    if (!userHasRole(user, 'aprovado') && !isStaff(user)) {
      throw redirect({ to: '/aguardando-aprovacao', search: { debug: undefined } })
    }
    return { user }
  },
  component: ConquistasPage,
})

const LETRAS_DA_SEMANA = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'] // segunda a domingo

// Texto da próxima recompensa — é o que gera expectativa ("falta 1 dia").
function textoDaProxima(proxima: ProximaConquista, conquista: Conquista) {
  const nome = conquista.misteriosa ? CONQUISTA_MISTERIOSA.nome : conquista.nome
  const dias = proxima.faltam === 1 ? 'Falta apenas 1 dia de estudo' : `Faltam ${proxima.faltam} dias de estudo`
  return { nome, chamada: `${dias} para desbloquear.` }
}

function ConquistasPage() {
  const [estado, setEstado] = useState<EstadoConquistas | null>(null)
  const [progresso, setProgresso] = useState<StudentProgress | null>(null)
  const [erro, setErro] = useState(false)
  const [celebrando, setCelebrando] = useState<string[]>([])

  useEffect(() => {
    getMyAchievements()
      .then((resultado) => {
        if (!resultado) return
        setEstado(resultado)
        if (resultado.novas.length > 0) setCelebrando(resultado.novas)
      })
      .catch(() => setErro(true))
    getStudentProgress()
      .then(setProgresso)
      .catch(() => { /* o cartão de progresso geral some, o resto da página continua */ })
  }, [])

  // Fecha a celebração e avisa o servidor, pra a animação não repetir na próxima visita.
  function encerrarCelebracao() {
    const ids = celebrando
    setCelebrando([])
    if (ids.length === 0) return
    markAchievementsSeen({ data: { ids } }).catch(() => { /* tenta de novo na próxima visita */ })
    setEstado((atual) => (atual ? { ...atual, novas: [] } : atual))
  }

  const desbloqueadas = new Map((estado?.desbloqueadas ?? []).map((item) => [item.id, item.em]))
  const novas = new Set(estado?.novas ?? [])

  // Quanto falta em cada conquista especial, pra o selo bloqueado não ser só um cadeado.
  function progressoDaEspecial(id: string): string | undefined {
    if (!estado) return undefined
    if (id === 'especial-aulas-5') return `${Math.min(estado.numeros.aulasAssistidas, META_AULAS)} de ${META_AULAS} aulas`
    if (id === 'especial-questoes-100') return `${Math.min(estado.numeros.questoesResolvidas, META_QUESTOES)} de ${META_QUESTOES} questões`
    if (id === 'especial-precisao' && estado.numeros.melhorPercentual > 0) return `Seu melhor até aqui: ${estado.numeros.melhorPercentual}%`
    if (id === 'especial-imparavel') return `Sua maior sequência: ${estado.sequencia.recorde} dia(s)`
    if (id === 'especial-modulo' && estado.numeros.totalAulas > 0) {
      return `${estado.numeros.aulasAssistidas} de ${estado.numeros.totalAulas} aulas assistidas`
    }
    return undefined
  }

  function progressoDaSequencia(conquista: Conquista): string | undefined {
    if (!estado || !conquista.dias) return undefined
    return `${estado.sequencia.recorde} de ${conquista.dias} dias`
  }

  const totalDesbloqueadas = desbloqueadas.size
  const totalConquistas = JORNADA_SEMANAL.length + SEQUENCIAS.length + ESPECIAIS.length

  const proximaConquista = estado?.proxima ? conquistaPorId(estado.proxima.id) : undefined
  const proximoTexto = estado?.proxima && proximaConquista ? textoDaProxima(estado.proxima, proximaConquista) : null

  return (
    <div className="panel panel-wide">
      <h1 style={{ marginBottom: 4 }}><Trophy /> Minhas conquistas</h1>
      <p className="panel-subtitle">
        Sua jornada da semana, sua sequência de estudos e a coleção de selos que você já desbloqueou.
      </p>

      {erro && (
        <div className="panel-card" style={{ marginTop: 20 }}>
          Não foi possível carregar suas conquistas agora. Atualize a página em alguns instantes.
        </div>
      )}

      {!estado && !erro && (
        <div className="conquistas-carregando">
          <div className="skeleton skeleton-block" style={{ height: 118 }} />
          <div className="skeleton skeleton-block" style={{ height: 188 }} />
          <div className="skeleton skeleton-block" style={{ height: 188 }} />
        </div>
      )}

      {estado && (
        <>
          {/* Painel de números: sequência, recorde, meta da semana e progresso do curso. */}
          <div className="conquistas-resumo">
            <div className="conquistas-metrica destaque">
              <span className="conquistas-metrica-icone"><Flame size={18} /></span>
              <b>{estado.sequencia.atual}</b>
              <small>{estado.sequencia.atual === 1 ? 'dia consecutivo estudando' : 'dias consecutivos estudando'}</small>
            </div>
            <div className="conquistas-metrica">
              <span className="conquistas-metrica-icone"><Trophy size={18} /></span>
              <b>{estado.sequencia.recorde}</b>
              <small>maior sequência já alcançada</small>
            </div>
            <div className="conquistas-metrica">
              <span className="conquistas-metrica-icone"><CalendarCheck2 size={18} /></span>
              <b>{estado.semana.diasConcluidos}/{estado.semana.meta}</b>
              <small>meta desta semana</small>
            </div>
            <div className="conquistas-metrica">
              <span className="conquistas-metrica-icone"><Target size={18} /></span>
              <b>{progresso ? `${progresso.overallPercent}%` : '—'}</b>
              <small>progresso geral do curso</small>
            </div>
          </div>

          {/* Missão de hoje: uma tarefa curta e objetiva, com ação direta. */}
          <section className="conquistas-missao">
            <div>
              <span className="conquistas-missao-tag"><Sparkles size={13} /> Missão de hoje</span>
              <h2>{estado.missao.titulo}</h2>
              <p>{estado.missao.descricao}</p>
            </div>
            <Link className="conquistas-missao-cta" to={estado.missao.href as never}>
              {estado.missao.cta} <ChevronRight size={16} />
            </Link>
          </section>

          {/* Jornada da semana: 5 dias, uma recompensa por dia. */}
          <section className="conquistas-bloco">
            <header className="conquistas-bloco-head">
              <div>
                <h2>Jornada da semana</h2>
                <p>Estude {estado.semana.meta} dias e desbloqueie uma recompensa a cada dia.</p>
              </div>
              <span className="conquistas-contador">
                {estado.semana.diasConcluidos} de {estado.semana.meta} dias concluídos — {estado.semana.percentual}%
              </span>
            </header>

            <div className="conquistas-barra" role="progressbar" aria-valuenow={estado.semana.percentual} aria-valuemin={0} aria-valuemax={100}>
              <motion.i
                initial={{ width: 0 }}
                animate={{ width: `${estado.semana.percentual}%` }}
                transition={{ duration: .7, ease: 'easeOut' }}
              />
            </div>

            <div className="conquistas-semana-dias">
              {estado.semana.dias.map((dia, indice) => (
                <span key={dia.data} className={dia.concluido ? 'done' : dia.hoje ? 'today' : ''}>
                  <i>{Number(dia.data.slice(8, 10))}</i>
                  <small>{LETRAS_DA_SEMANA[indice]}</small>
                </span>
              ))}
            </div>

            <ol className="conquistas-trilha">
              {JORNADA_SEMANAL.map((etapa, indice) => {
                const conquistada = desbloqueadas.has(etapa.id)
                return (
                  <motion.li
                    key={etapa.id}
                    className={conquistada ? `raridade-${etapa.raridade} conquistada` : `raridade-${etapa.raridade}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: indice * .06, duration: .35 }}
                  >
                    <span className="conquistas-trilha-selo">
                      {conquistada ? <IconeDaConquista icone={etapa.icone} size={20} /> : <Lock size={15} />}
                    </span>
                    <b>{etapa.nome}</b>
                    <small>{conquistada ? etapa.mensagem : `Dia ${etapa.dias}`}</small>
                  </motion.li>
                )
              })}
            </ol>

            {proximoTexto && (
              <div className="conquistas-proxima">
                <span className="conquistas-proxima-selo">
                  {proximaConquista?.misteriosa
                    ? <Sparkles size={18} />
                    : <IconeDaConquista icone={proximaConquista!.icone} size={18} />}
                </span>
                <div>
                  <b>Próxima conquista: {proximoTexto.nome}</b>
                  <p>{proximoTexto.chamada}</p>
                </div>
              </div>
            )}
          </section>

          {/* Sequência: a camada que continua depois dos 5 dias. */}
          <section className="conquistas-bloco">
            <header className="conquistas-bloco-head">
              <div>
                <h2>Sequência de estudos</h2>
                <p>Não reinicia depois da meta semanal — cada dia seguido soma na sua sequência.</p>
              </div>
              <span className="conquistas-contador">{estado.sequencia.recorde} dia(s) no seu recorde</span>
            </header>
            <div className="conquistas-colecao">
              {SEQUENCIAS.map((conquista) => (
                <ConquistaBadge
                  key={conquista.id}
                  conquista={conquista}
                  desbloqueada={desbloqueadas.has(conquista.id)}
                  em={desbloqueadas.get(conquista.id)}
                  progresso={progressoDaSequencia(conquista)}
                  nova={novas.has(conquista.id)}
                />
              ))}
            </div>
          </section>

          {/* Especiais: não dependem só de dias estudados. */}
          <section className="conquistas-bloco">
            <header className="conquistas-bloco-head">
              <div>
                <h2>Conquistas especiais</h2>
                <p>Aulas, questões, revisões e desempenho — cada uma com sua própria regra.</p>
              </div>
              <span className="conquistas-contador">{totalDesbloqueadas} de {totalConquistas} no total</span>
            </header>
            <div className="conquistas-colecao">
              {ESPECIAIS.map((conquista) => (
                <ConquistaBadge
                  key={conquista.id}
                  conquista={conquista}
                  desbloqueada={desbloqueadas.has(conquista.id)}
                  em={desbloqueadas.get(conquista.id)}
                  progresso={progressoDaEspecial(conquista.id)}
                  nova={novas.has(conquista.id)}
                />
              ))}
            </div>
          </section>
        </>
      )}

      <CelebracaoDeConquista ids={celebrando} onFechar={encerrarCelebracao} />
    </div>
  )
}

// Animação leve de desbloqueio. Quando várias saem de uma vez (primeira visita
// de um aluno que já estudava), mostra um resumo em vez de uma janela por selo.
function CelebracaoDeConquista({ ids, onFechar }: { ids: string[]; onFechar: () => void }) {
  const conquistas = ids.map(conquistaPorId).filter((item): item is Conquista => !!item)

  return (
    <AnimatePresence>
      {conquistas.length > 0 && (
        <motion.div
          className="conquista-celebracao-fundo"
          role="dialog"
          aria-modal="true"
          aria-label="Nova conquista desbloqueada"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onFechar}
        >
          <motion.div
            className="conquista-celebracao"
            initial={{ opacity: 0, scale: .9, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: .95 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            onClick={(evento) => evento.stopPropagation()}
          >
            <span className="conquista-celebracao-tag">
              {conquistas.length === 1 ? 'Nova conquista' : `${conquistas.length} novas conquistas`}
            </span>

            <div className="conquista-celebracao-selos">
              {conquistas.slice(0, 3).map((conquista, indice) => (
                <motion.span
                  key={conquista.id}
                  className={`conquista-celebracao-selo raridade-${conquista.raridade}`}
                  initial={{ scale: .5, rotate: -8, opacity: 0 }}
                  animate={{ scale: 1, rotate: 0, opacity: 1 }}
                  transition={{ delay: .1 + indice * .12, type: 'spring', stiffness: 300, damping: 18 }}
                >
                  <IconeDaConquista icone={conquista.icone} size={30} />
                </motion.span>
              ))}
            </div>

            <h3>{conquistas.length === 1 ? conquistas[0]!.nome : 'Você desbloqueou novas conquistas'}</h3>
            <p>
              {conquistas.length === 1
                ? conquistas[0]!.mensagem
                : conquistas.slice(0, 3).map((conquista) => conquista.nome).join(', ')
                  + (conquistas.length > 3 ? ` e mais ${conquistas.length - 3}.` : '.')}
            </p>

            <button type="button" className="button" onClick={onFechar}>Continuar</button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
