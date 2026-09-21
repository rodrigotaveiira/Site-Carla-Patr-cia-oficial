import { createFileRoute, redirect } from '@tanstack/react-router'
import { Send, Users } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { readLocalUser } from '@/lib/identity-context'
import { getServerUser } from '@/lib/auth'
import { userHasRole } from '@/lib/roles'
import { enviarConviteMentorias, listVagasMentoriaGrupo, type VagaMentoriaGrupo } from '@/lib/convite-mentorias'
import { formatarHora } from '@/lib/formato'
import { useToast } from '@/lib/toast'
import { VoltarAoPainel } from '@/components/VoltarAoPainel'

export const Route = createFileRoute('/convite-mentorias-admin')({
  beforeLoad: async () => {
    if (typeof window !== 'undefined') {
      const localUser = readLocalUser()
      if (localUser && userHasRole(localUser, 'admin')) return { user: localUser }
    }

    const user = await getServerUser()
    if (!user) throw redirect({ to: '/login' })
    if (!userHasRole(user, 'admin')) throw redirect({ to: '/dashboard' })
    return { user }
  },
  component: ConviteMentoriasAdminPage,
})

// Texto que já vem escrito no campo. É o recado que a professora mandaria de
// qualquer jeito — deixar pronto evita reescrever a mesma coisa toda semana, e
// ela edita quando quiser dizer outra coisa.
const MENSAGEM_PADRAO =
  'Ainda dá tempo de garantir seu lugar nas mentorias em grupo! Escolha o horário que melhor encaixa na sua rotina.'

function formatarDataLonga(date: string) {
  const [ano, mes, dia] = date.split('-').map(Number)
  const texto = new Date(ano, mes - 1, dia).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  })
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

function contarVagas(vagas: number) {
  return vagas === 1 ? '1 vaga' : `${vagas} vagas`
}

function ConviteMentoriasAdminPage() {
  const showToast = useToast()
  const [vagas, setVagas] = useState<VagaMentoriaGrupo[]>([])
  const [loading, setLoading] = useState(true)
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  const [mensagem, setMensagem] = useState(MENSAGEM_PADRAO)
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const lista = await listVagasMentoriaGrupo()
      setVagas(lista)
      // Tudo marcado de saída: o caso comum é convidar pra todos os grupos
      // abertos, e desmarcar um é mais rápido do que marcar cinco.
      setSelecionados(new Set(lista.map((vaga) => vaga.id)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar os grupos.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  // Agrupado por tamanho do grupo — é assim que os grupos são chamados no dia
  // a dia ("os de 5", "os de 15"), então é assim que eles ficam na tela.
  const porTamanho = useMemo(() => {
    const mapa = new Map<number, VagaMentoriaGrupo[]>()
    for (const vaga of vagas) {
      const atual = mapa.get(vaga.capacidade) ?? []
      atual.push(vaga)
      mapa.set(vaga.capacidade, atual)
    }
    return [...mapa.entries()].sort((a, b) => a[0] - b[0])
  }, [vagas])

  function alternar(id: string) {
    setSelecionados((antes) => {
      const proximo = new Set(antes)
      if (proximo.has(id)) proximo.delete(id)
      else proximo.add(id)
      return proximo
    })
  }

  function alternarTamanho(capacidade: number, marcar: boolean) {
    const ids = vagas.filter((vaga) => vaga.capacidade === capacidade).map((vaga) => vaga.id)
    setSelecionados((antes) => {
      const proximo = new Set(antes)
      for (const id of ids) {
        if (marcar) proximo.add(id)
        else proximo.delete(id)
      }
      return proximo
    })
  }

  const totalSelecionado = selecionados.size
  const vagasSelecionadas = vagas
    .filter((vaga) => selecionados.has(vaga.id))
    .reduce((soma, vaga) => soma + vaga.vagas, 0)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')

    if (totalSelecionado === 0) {
      setError('Escolha pelo menos um grupo para incluir no convite.')
      return
    }

    // O envio alcança a turma inteira e não tem desfazer: confirma antes,
    // dizendo o tamanho do estrago caso seja engano.
    const ok = confirm(
      `Enviar o convite para todos os alunos?\n\n`
        + `${totalSelecionado} ${totalSelecionado === 1 ? 'grupo' : 'grupos'}, `
        + `${contarVagas(vagasSelecionadas)} no total.\n\n`
        + `Eles recebem por e-mail e no sininho do dashboard.`,
    )
    if (!ok) return

    setEnviando(true)
    try {
      const resultado = await enviarConviteMentorias({
        data: { slotIds: [...selecionados], mensagem },
      })
      showToast(`Convite enviado: ${resultado.grupos} ${resultado.grupos === 1 ? 'grupo' : 'grupos'}, ${contarVagas(resultado.vagas)}.`)
      await load()
      setMensagem(MENSAGEM_PADRAO)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível enviar o convite.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className="panel">
      <VoltarAoPainel />
      <h1><Send /> Convite para as mentorias</h1>
      <p className="panel-subtitle">
        Lembre os alunos de reservar a vaga nas mentorias em grupo que ainda têm lugar.
        O convite vai por e-mail e também aparece no sininho do dashboard.
      </p>

      <form onSubmit={handleSubmit}>
        <section>
          <h2 className="panel-section-title">Grupos com vaga</h2>

          {loading && <p className="panel-subtitle">Carregando...</p>}

          {!loading && vagas.length === 0 && (
            <p className="empty-state">
              Nenhum grupo futuro com vaga aberta. Cadastre horários em "Mentorias em grupo" —
              ou todos os grupos já estão cheios.
            </p>
          )}

          {porTamanho.map(([capacidade, doTamanho]) => {
            const todosMarcados = doTamanho.every((vaga) => selecionados.has(vaga.id))
            return (
              <div key={capacidade} style={{ marginTop: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <b style={{ color: 'var(--navy)', fontSize: 14 }}>
                    <Users size={15} style={{ verticalAlign: '-2px', marginRight: 6 }} />
                    Grupos de {capacidade} {capacidade === 1 ? 'pessoa' : 'pessoas'}
                  </b>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => alternarTamanho(capacidade, !todosMarcados)}
                  >
                    {todosMarcados ? 'Desmarcar todos' : 'Marcar todos'}
                  </button>
                </div>

                <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
                  {doTamanho.map((vaga) => (
                    <label key={vaga.id} className="list-row" style={{ cursor: 'pointer', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                        <input
                          type="checkbox"
                          checked={selecionados.has(vaga.id)}
                          onChange={() => alternar(vaga.id)}
                          style={{ width: 17, height: 17, accentColor: 'var(--purple)', flexShrink: 0 }}
                        />
                        <div style={{ minWidth: 0 }}>
                          <p style={{ margin: 0, color: 'var(--navy)', fontWeight: 700 }}>{vaga.titulo}</p>
                          <div className="list-meta" style={{ marginTop: 4 }}>
                            {formatarDataLonga(vaga.date)}, {formatarHora(vaga.time)} às {formatarHora(vaga.endTime)}
                            {' · '}
                            {vaga.inscritos}/{vaga.capacidade} inscritos
                          </div>
                        </div>
                      </div>
                      <span style={{ color: 'var(--purple)', fontWeight: 800, fontSize: 13, whiteSpace: 'nowrap' }}>
                        {contarVagas(vaga.vagas)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )
          })}
        </section>

        {vagas.length > 0 && (
          <section style={{ marginTop: 26 }}>
            <h2 className="panel-section-title">Mensagem</h2>
            <p className="panel-subtitle" style={{ marginTop: 4 }}>
              Aparece antes da lista de horários. Pode deixar como está.
            </p>

            <div className="panel-card" style={{ marginTop: 12 }}>
              <textarea
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
                rows={3}
                maxLength={2000}
              />

              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <button type="submit" disabled={enviando || totalSelecionado === 0} className="btn btn-primary" style={{ width: 'fit-content' }}>
                  {enviando ? 'Enviando...' : 'Enviar convite'}
                </button>
                <span className="list-meta">
                  {totalSelecionado === 0
                    ? 'Nenhum grupo escolhido'
                    : `${totalSelecionado} ${totalSelecionado === 1 ? 'grupo escolhido' : 'grupos escolhidos'} · ${contarVagas(vagasSelecionadas)}`}
                </span>
              </div>

              {error && <p className="form-error">{error}</p>}
            </div>
          </section>
        )}

        {vagas.length === 0 && error && <p className="form-error">{error}</p>}
      </form>
    </main>
  )
}
