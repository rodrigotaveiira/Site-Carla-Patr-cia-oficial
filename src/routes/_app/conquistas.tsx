import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronRight, Lock, Sparkles, Trophy } from 'lucide-react'
import { useEffect, useState, type CSSProperties } from 'react'
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

// Cabeçalho de seção: título em serifa, fio dourado até o contador.
function CabecalhoDeSecao({ titulo, contador, hint }: { titulo: string; contador: string; hint: string }) {
  return (
    <>
      <div className="conquistas-secao-head">
        <h2>{titulo}</h2>
        <i aria-hidden="true" />
        <span className="conquistas-contador">{contador}</span>
      </div>
      <p className="conquistas-secao-hint">{hint}</p>
    </>
  )
}

function ConquistasPage() {
  const [estado, setEstado] = useState<EstadoConquistas | null>(null)
  const [progresso, setProgresso] = useState<StudentProgress | null>(null)
  const [erro, setErro] = useState(false)
  const [celebrando, setCelebrando] = useState<string[]>([])
  // Um único momento animado na chegada: a barra da semana e o fio da trilha
  // saem de zero juntos, com a mesma curva. Sai do zero só depois que os
  // dados chegam, senão a transição do CSS não teria de onde partir.
  const [revelado, setRevelado] = useState(false)

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
      .catch(() => { /* o número de progresso vira "—", o resto da página continua */ })
  }, [])

  useEffect(() => {
    if (!estado) return
    const quadro = requestAnimationFrame(() => setRevelado(true))
    return () => cancelAnimationFrame(quadro)
  }, [estado])

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

  const totalConquistas = JORNADA_SEMANAL.length + SEQUENCIAS.length + ESPECIAIS.length

  const proximaConquista = estado?.proxima ? conquistaPorId(estado.proxima.id) : undefined
  const proximoTexto = estado?.proxima && proximaConquista ? textoDaProxima(estado.proxima, proximaConquista) : null

  // Fração do fio da trilha que fica preenchida: são 5 medalhões, logo 4
  // trechos entre eles — com 3 dias feitos, 2 trechos estão vencidos.
  const trechosDaTrilha = JORNADA_SEMANAL.length - 1
  const fracaoDaTrilha = estado
    ? Math.max(0, Math.min(1, (estado.semana.diasConcluidos - 1) / trechosDaTrilha))
    : 0

  return (
    <div className="panel panel-wide conquistas">
      <h1 style={{ marginBottom: 4 }}><Trophy /> Minhas conquistas</h1>
      <p className="panel-subtitle">
        Sua jornada da semana, sua sequência de estudos e a coleção de selos que você já desbloqueou.
      </p>

      {erro && (
        <div className="panel-card" style={{ marginTop: 24 }}>
          Não foi possível carregar suas conquistas agora. Atualize a página em alguns instantes.
        </div>
      )}

      {!estado && !erro && (
        <div className="conquistas-carregando">
          <div className="skeleton skeleton-block" style={{ height: 92 }} />
          <div className="skeleton skeleton-block" style={{ height: 116 }} />
          <div className="skeleton skeleton-block" style={{ height: 240 }} />
        </div>
      )}

      {estado && (
        <>
          {/* Os quatro números que respondem "como eu estou indo". */}
          <div className="conquistas-numeros">
            <div>
              <b>{estado.sequencia.atual}</b>
              <span>{estado.sequencia.atual === 1 ? 'dia seguido' : 'dias seguidos'}</span>
            </div>
            <div><b>{estado.sequencia.recorde}</b><span>maior sequência</span></div>
            <div><b>{estado.semana.diasConcluidos}/{estado.semana.meta}</b><span>meta da semana</span></div>
            <div><b>{progresso ? `${progresso.overallPercent}%` : '—'}</b><span>progresso do curso</span></div>
          </div>

          {/* A única superfície sólida e escura da página, porque é a única ação. */}
          <section className="conquistas-missao">
            <div>
              <h2>{estado.missao.titulo}</h2>
              <p>Sua missão de hoje. {estado.missao.descricao}</p>
            </div>
            <Link className="conquistas-missao-cta" to={estado.missao.href as never}>
              {estado.missao.cta} <ChevronRight size={16} />
            </Link>
          </section>

          {/* Jornada da semana: 5 dias, uma recompensa por dia. */}
          <section className="conquistas-secao">
            <CabecalhoDeSecao
              titulo="Jornada da semana"
              contador={`${estado.semana.diasConcluidos} de ${estado.semana.meta} dias — ${estado.semana.percentual}%`}
              hint={`Estude ${estado.semana.meta} dias e desbloqueie uma recompensa a cada dia.`}
            />

            <div
              className="conquistas-barra"
              role="progressbar"
              aria-label="Progresso da meta semanal"
              aria-valuenow={estado.semana.percentual}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <i style={{ width: `${revelado ? estado.semana.percentual : 0}%` }} />
            </div>

            <div className="conquistas-semana-dias">
              {estado.semana.dias.map((dia, indice) => (
                <span key={dia.data} className={dia.concluido ? 'done' : dia.hoje ? 'today' : ''}>
                  <i>{Number(dia.data.slice(8, 10))}</i>
                  <small>{LETRAS_DA_SEMANA[indice]}</small>
                </span>
              ))}
            </div>

            <ol className="conquistas-trilha" style={{ '--trilha': revelado ? fracaoDaTrilha : 0 } as CSSProperties}>
              {JORNADA_SEMANAL.map((etapa) => {
                const conquistada = desbloqueadas.has(etapa.id)
                return (
                  <li key={etapa.id} className={conquistada ? `raridade-${etapa.raridade} conquistada` : `raridade-${etapa.raridade}`}>
                    <span className="conquistas-trilha-selo">
                      {conquistada ? <IconeDaConquista icone={etapa.icone} size={22} /> : <Lock size={16} />}
                    </span>
                    <b>{etapa.nome}</b>
                    <small>{conquistada ? etapa.mensagem : `Dia ${etapa.dias}`}</small>
                  </li>
                )
              })}
            </ol>

            {proximoTexto && (
              <div className={`conquistas-proxima raridade-${proximaConquista!.raridade}`}>
                <span className="conquistas-proxima-selo">
                  {proximaConquista!.misteriosa
                    ? <Sparkles size={19} />
                    : <IconeDaConquista icone={proximaConquista!.icone} size={19} />}
                </span>
                <div>
                  <b>Próxima conquista: {proximoTexto.nome}</b>
                  <p>{proximoTexto.chamada}</p>
                </div>
              </div>
            )}
          </section>

          {/* Sequência: a camada que continua depois dos 5 dias. */}
          <section className="conquistas-secao">
            <CabecalhoDeSecao
              titulo="Sequência de estudos"
              contador={`recorde de ${estado.sequencia.recorde} dia(s)`}
              hint="Não reinicia depois da meta semanal — cada dia seguido soma na sua sequência."
            />
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
          <section className="conquistas-secao">
            <CabecalhoDeSecao
              titulo="Conquistas especiais"
              contador={`${desbloqueadas.size} de ${totalConquistas} selos`}
              hint="Aulas, questões, revisões e desempenho — cada uma com sua própria regra."
            />
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

// Animação de desbloqueio. Quando várias saem de uma vez (primeira visita de
// um aluno que já estudava), mostra um resumo em vez de uma janela por selo.
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
            initial={{ opacity: 0, scale: .92, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: .96 }}
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
                  initial={{ scale: .5, rotate: -10, opacity: 0 }}
                  animate={{ scale: 1, rotate: 0, opacity: 1 }}
                  transition={{ delay: .12 + indice * .12, type: 'spring', stiffness: 300, damping: 18 }}
                >
                  <IconeDaConquista icone={conquista.icone} size={31} />
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
