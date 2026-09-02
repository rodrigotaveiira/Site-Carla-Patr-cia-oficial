import { createFileRoute, redirect } from '@tanstack/react-router'
import { readLocalUser } from '@/lib/identity-context'
import { getServerUser } from '@/lib/auth'
import { userHasRole, isStaff } from '@/lib/roles'

// Mesmo guard das outras páginas da área do aluno. Antes esta rota era a única
// sem checagem nenhuma: respondia 200 pra qualquer visitante, com o título
// "Calendário de Mentorias" à mostra.
export const Route = createFileRoute('/_app/calendario')({
  beforeLoad: async () => {
    if (typeof window !== 'undefined') {
      const localUser = readLocalUser()
      if (localUser) return { user: localUser }
    }

    const user = await getServerUser()
    if (!user) throw redirect({ to: '/login' })
    if (!userHasRole(user, 'aprovado') && !isStaff(user)) {
      throw redirect({ to: '/aguardando-aprovacao', search: { debug: undefined } })
    }
    return { user }
  },
  component: CalendarioPage,
})

function CalendarioPage() {
  return (
    <div className="panel">
      <h1 style={{ marginBottom: 4 }}>Calendário de Mentorias</h1>
      <p className="panel-subtitle">Escolha uma data disponível para marcar sua mentoria individual.</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(44px, 1fr))', gap: 10, marginTop: 20 }}>
        {Array.from({ length: 31 }).map((_, index) => (
          <button key={index} className="btn btn-ghost" style={{ justifyContent: 'center' }}>
            {index + 1}
          </button>
        ))}
      </div>
    </div>
  )
}
