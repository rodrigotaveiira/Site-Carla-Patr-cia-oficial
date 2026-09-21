import { createFileRoute, redirect } from '@tanstack/react-router'
import { BookMarked, CircleHelp, CirclePlay, Files, Library, Target, Zap } from 'lucide-react'
import { useEffect, useState } from 'react'
import { readLocalUser } from '@/lib/identity-context'
import { getServerUser } from '@/lib/auth'
import { userHasRole, isStaff } from '@/lib/roles'
import { getContentCounts, getStudentProgress, REDACOES_META_PROGRESSO, type ContentCounts, type StudentProgress } from '@/lib/progress'
import { VoltarAoPainel } from '@/components/VoltarAoPainel'

export const Route = createFileRoute('/_app/progresso')({
  beforeLoad: async () => {
    if (typeof window !== 'undefined') {
      const localUser = readLocalUser()
      if (localUser) return { user: localUser }
    }

    const user = await getServerUser()
    if (!user) throw redirect({ to: '/login' })
    // `debug` e opcional na tela de espera — vai undefined pra nao sujar a URL.
    if (!userHasRole(user, 'aprovado') && !isStaff(user)) {
      throw redirect({ to: '/aguardando-aprovacao', search: { debug: undefined } })
    }
    return { user }
  },
  component: ProgressoPage,
})

function ProgressoPage() {
  const [counts, setCounts] = useState<ContentCounts | null>(null)
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState<StudentProgress | null>(null)

  useEffect(() => {
    getContentCounts()
      .then(setCounts)
      .finally(() => setLoading(false))
    getStudentProgress().then(setProgress).catch(() => { /* seção de evolução some se der erro */ })
  }, [])

  const rows = counts
    ? [
        { icon: CirclePlay, label: 'Aulas', count: counts.aulas, to: '/aulas' },
        { icon: Files, label: 'Materiais', count: counts.materiais, to: '/materiais' },
        { icon: Library, label: 'Biblioteca', count: counts.bibliotecas.biblioteca, to: '/conteudo/biblioteca' },
        { icon: CircleHelp, label: 'Questões', count: counts.bibliotecas.questoes, to: '/conteudo/questoes' },
        { icon: Target, label: 'Simulados', count: counts.bibliotecas.simulados, to: '/conteudo/simulados' },
        { icon: BookMarked, label: 'Repertórios', count: counts.bibliotecas.repertorios, to: '/conteudo/repertorios' },
        { icon: Zap, label: 'Dicas', count: counts.bibliotecas.dicas, to: '/conteudo/dicas' },
      ]
    : []

  const maxCount = Math.max(1, ...rows.map((r) => r.count))

  return (
    <div className="panel">
      <VoltarAoPainel destino="/dashboard" />
      <h1 style={{ marginBottom: 4 }}>Meu progresso</h1>
      <p className="panel-subtitle">Sua evolução na plataforma, com base nas aulas assistidas, nos materiais baixados, nas questões para treino respondidas e nas redações entregues.</p>

      {progress && (
        <div style={{ marginTop: 20, padding: '20px', background: 'linear-gradient(135deg, var(--purple), #9333ea)', borderRadius: 12, color: '#fff' }}>
          <div style={{ fontSize: 32, fontWeight: 800 }}>{progress.overallPercent}%</div>
          <div style={{ opacity: 0.9, fontSize: 14, marginBottom: 14 }}>progresso geral</div>
          <div style={{ display: 'grid', gap: 10 }}>
            {/* Só entra a fatia que tem o que contar — é a mesma regra da média
                em progress.ts, pra a soma exibida bater com o número de cima. */}
            {progress.aulasTracked && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span>Aulas assistidas</span>
                  <span>{progress.aulasAssistidas} de {progress.aulasDisponiveis}</span>
                </div>
                <div style={{ marginTop: 4, height: 6, background: 'rgba(255,255,255,0.25)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: `${progress.aulasPercent}%`, height: '100%', background: '#fff' }} />
                </div>
              </div>
            )}
            {progress.materiaisTracked && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span>Materiais baixados</span>
                  <span>{progress.materiaisBaixados} de {progress.materiaisDisponiveis}</span>
                </div>
                <div style={{ marginTop: 4, height: 6, background: 'rgba(255,255,255,0.25)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: `${progress.materiaisPercent}%`, height: '100%', background: '#fff' }} />
                </div>
              </div>
            )}
            {progress.simuladosTracked && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span>Questões para treino</span>
                  <span>{progress.simuladosRespondidos} de {progress.simuladosDisponiveis}</span>
                </div>
                <div style={{ marginTop: 4, height: 6, background: 'rgba(255,255,255,0.25)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: `${progress.simuladosPercent}%`, height: '100%', background: '#fff' }} />
                </div>
              </div>
            )}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span>Redações entregues</span>
                <span>{progress.redacoesEntregues} de {REDACOES_META_PROGRESSO}</span>
              </div>
              <div style={{ marginTop: 4, height: 6, background: 'rgba(255,255,255,0.25)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: `${progress.redacoesPercent}%`, height: '100%', background: '#fff' }} />
              </div>
            </div>
          </div>
          {!progress.aulasTracked && !progress.materiaisTracked && !progress.simuladosTracked && (
            <p style={{ margin: '14px 0 0', fontSize: 12.5, lineHeight: 1.6, color: 'rgba(255,255,255,0.8)' }}>
              Aulas, materiais e questões entram nesta conta assim que a professora publicar os primeiros do curso.
            </p>
          )}
        </div>
      )}

      <p className="panel-subtitle" style={{ marginTop: 24 }}>Quantidade de conteúdo disponível na plataforma hoje, por seção.</p>

      {loading && <p className="panel-subtitle" style={{ marginTop: 20 }}>Carregando...</p>}

      {counts && (
        <>
          <div className="panel-card" style={{ fontWeight: 700, color: 'var(--navy)' }}>
            {counts.totalArquivos + counts.aulas} conteúdo(s) disponíveis no total ({counts.aulas} aula{counts.aulas === 1 ? '' : 's'} em vídeo e {counts.totalArquivos} arquivo{counts.totalArquivos === 1 ? '' : 's'} em PDF/Word)
          </div>

          <div style={{ display: 'grid', gap: 12, marginTop: 20 }}>
            {rows.map((row) => (
              <a key={row.label} href={row.to} className="list-row" style={{ textDecoration: 'none', color: 'inherit' }}>
                <row.icon color="var(--purple)" size={20} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--navy)', fontWeight: 700 }}>
                    <span>{row.label}</span>
                    <span>{row.count}</span>
                  </div>
                  <div style={{ marginTop: 6, height: 6, background: '#f0f1f4', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${(row.count / maxCount) * 100}%`, height: '100%', background: 'var(--purple)' }} />
                  </div>
                </div>
              </a>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
