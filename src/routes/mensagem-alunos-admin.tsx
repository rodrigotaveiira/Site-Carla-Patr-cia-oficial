import { createFileRoute, redirect } from '@tanstack/react-router'
import { MessageSquareText } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { readLocalUser } from '@/lib/identity-context'
import { getServerUser } from '@/lib/auth'
import { isStaff } from '@/lib/roles'
import { contarAlunosParaMensagem, enviarMensagemAlunos } from '@/lib/mensagem-alunos'
import { useToast } from '@/lib/toast'
import { VoltarAoPainel } from '@/components/VoltarAoPainel'

export const Route = createFileRoute('/mensagem-alunos-admin')({
  beforeLoad: async () => {
    if (typeof window !== 'undefined') {
      const localUser = readLocalUser()
      if (localUser && isStaff(localUser)) return { user: localUser }
    }

    const user = await getServerUser()
    if (!user) throw redirect({ to: '/login' })
    if (!isStaff(user)) throw redirect({ to: '/dashboard' })
    return { user }
  },
  component: MensagemAlunosAdminPage,
})

// Textos que já vêm escritos, prontos pra enviar sem editar nada — o caso de
// uso original desta tela. A professora edita quando quiser mandar outra
// coisa.
const ASSUNTO_PADRAO = 'Não deixe os exercícios e as redações para depois'
const MENSAGEM_PADRAO =
  'Fazer os exercícios de fixação e escrever as redações com regularidade é o que realmente constrói sua evolução — muito mais do que só assistir às aulas.\n\n'
  + 'Reserve um tempinho essa semana para colocar em dia o que ainda estiver faltando. Qualquer dúvida, estou por aqui!'

function MensagemAlunosAdminPage() {
  const showToast = useToast()
  const [total, setTotal] = useState<number | null>(null)
  const [assunto, setAssunto] = useState(ASSUNTO_PADRAO)
  const [mensagem, setMensagem] = useState(MENSAGEM_PADRAO)
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    contarAlunosParaMensagem()
      .then((r) => setTotal(r.total))
      .catch((err) => setError(err instanceof Error ? err.message : 'Não foi possível carregar a turma.'))
  }, [])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')

    if (!assunto.trim() || !mensagem.trim()) {
      setError('Escreva o assunto e a mensagem antes de enviar.')
      return
    }

    // Alcança a turma inteira e não tem desfazer: confirma antes, dizendo o
    // tamanho do estrago caso seja engano.
    const ok = confirm(
      `Enviar esta mensagem para ${total ?? 'todos os'} aluno(s) aprovado(s)?\n\n`
        + `Eles recebem por e-mail e no sininho do dashboard.`,
    )
    if (!ok) return

    setEnviando(true)
    try {
      const resultado = await enviarMensagemAlunos({ data: { assunto, mensagem } })
      showToast(`Mensagem enviada para ${resultado.total} ${resultado.total === 1 ? 'aluno' : 'alunos'}.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível enviar a mensagem.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className="panel">
      <VoltarAoPainel />
      <h1><MessageSquareText /> Mensagem para os alunos</h1>
      <p className="panel-subtitle">
        Escreva um recado e envie pra turma toda — por e-mail e no sininho do dashboard.
        Alcança todo aluno com conta aprovada, mesmo quem ainda não entrou no site.
      </p>

      <form onSubmit={handleSubmit} className="panel-card">
        <div className="field">
          <label htmlFor="mensagem-assunto">Assunto</label>
          <input
            id="mensagem-assunto"
            type="text"
            value={assunto}
            onChange={(e) => setAssunto(e.target.value)}
            maxLength={150}
          />
        </div>

        <div className="field">
          <label htmlFor="mensagem-corpo">Mensagem</label>
          <textarea
            id="mensagem-corpo"
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            rows={7}
            maxLength={5000}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <button type="submit" disabled={enviando} className="btn btn-primary" style={{ width: 'fit-content' }}>
            {enviando ? 'Enviando...' : 'Enviar para a turma'}
          </button>
          <span className="list-meta">
            {total === null ? 'Carregando turma...' : `${total} ${total === 1 ? 'aluno aprovado' : 'alunos aprovados'}`}
          </span>
        </div>

        {error && <p className="form-error">{error}</p>}
      </form>
    </main>
  )
}
