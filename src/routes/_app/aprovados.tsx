import { createFileRoute, redirect } from '@tanstack/react-router'
import { GraduationCap, Quote, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { readLocalUser } from '@/lib/identity-context'
import { getServerUser } from '@/lib/auth'
import { userHasRole, isStaff } from '@/lib/roles'
import { listAprovados, type ApprovedStudent } from '@/lib/aprovados'
import { EmptyState } from '@/components/EmptyState'

export const Route = createFileRoute('/_app/aprovados')({
  beforeLoad: async () => {
    if (typeof window !== 'undefined') {
      const localUser = readLocalUser()
      if (localUser) return { user: localUser }
    }

    const user = await getServerUser()
    if (!user) throw redirect({ to: '/login' })
    if (!userHasRole(user, 'aprovado') && !isStaff(user)) throw redirect({ to: '/aguardando-aprovacao' })
    return { user }
  },
  component: AprovadosPage,
})

function AprovadosSkeletonGrid() {
  return (
    <div className="aprovados-grid" aria-hidden="true">
      {Array.from({ length: 4 }).map((_, index) => (
        <div className="aprovado-card aprovado-card-skeleton" key={index}>
          <span className="skeleton" style={{ aspectRatio: '4/5', borderRadius: 0 }} />
          <div style={{ padding: '14px 16px 18px', display: 'grid', gap: 8 }}>
            <span className="skeleton skeleton-line sm w-60" />
            <span className="skeleton skeleton-line sm w-40" />
          </div>
        </div>
      ))}
    </div>
  )
}

function AprovadosPage() {
  const [items, setItems] = useState<ApprovedStudent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    listAprovados()
      .then(setItems)
      .catch(() => setError('Não foi possível carregar a galeria agora.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="panel panel-wide">
      <h1><GraduationCap /> Galeria dos Aprovados</h1>
      <p className="panel-subtitle">
        Alunos da turma que já conquistaram a vaga na faculdade. Constância e dedicação levam pra esse mural —
        a próxima foto aqui pode ser a sua.
      </p>
      {!loading && !error && items.length > 0 && (
        <p className="panel-meta-strip">
          {items.length} {items.length === 1 ? 'aluno aprovado' : 'alunos aprovados'} até agora
        </p>
      )}

      {error && <p className="form-error">{error}</p>}
      {loading && <div style={{ marginTop: 20 }}><AprovadosSkeletonGrid /></div>}

      {!loading && items.length > 0 && (
        <div className="aprovados-grid">
          {items.map((item) => (
            <article className="aprovado-card" key={item.id}>
              <div className="aprovado-photo">
                <img src={item.photoDataUrl} alt={`Foto de ${item.name}`} />
                {item.year && <span className="aprovado-year">{item.year}</span>}
                <div className="aprovado-name-overlay">
                  <b title={item.name}>{item.name}</b>
                  <span title={item.university}>{item.university}</span>
                </div>
              </div>
              <div className="aprovado-body">
                {item.course && (
                  <span className="aprovado-course" title={item.course}><Sparkles size={12} /> <span>{item.course}</span></span>
                )}
                {item.quote && (
                  <p className="aprovado-quote" title={item.quote}><Quote size={12} /> <span>{item.quote}</span></p>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div style={{ marginTop: 20 }}>
          <EmptyState
            icon={GraduationCap}
            title="Ainda não há aprovados na galeria"
            description="Assim que a professora publicar as primeiras conquistas da turma, elas aparecem aqui."
          />
        </div>
      )}
    </div>
  )
}
