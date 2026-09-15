import { Link } from '@tanstack/react-router'
import { CalendarDays, ChevronRight, CirclePlay, FileCheck2, PenLine, Target } from 'lucide-react'
import { useEffect, useRef } from 'react'

// Cada bloco leva pra própria seção. Num primeiro acesso a pergunta é "por onde
// eu começo": listar quatro recursos sem deixar ir a nenhum deles é a pior
// resposta possível. O botão de baixo continua sendo o caminho sugerido — estes
// são os atalhos pra quem já sabe o que quer.
const FEATURES = [
  { icon: CirclePlay, label: 'Aulas em vídeo, no seu ritmo', to: '/aulas' },
  { icon: FileCheck2, label: 'Redações com correção detalhada', to: '/redacoes' },
  { icon: Target, label: 'Simulados com nota na hora', to: '/simulados' },
  { icon: CalendarDays, label: 'Mentoria individual com a Carla', to: '/mentorias' },
] as const

// Boas-vindas de primeiro acesso: aparece uma única vez, some pra sempre depois do primeiro dismiss.
export function OnboardingModal({ studentName, onDismiss }: { studentName: string; onDismiss: () => void }) {
  // Esc fecha, como em qualquer diálogo. O `onDismiss` do dashboard é recriado
  // a cada render dele, então fica na ref: senão o listener seria trocado a
  // cada renderização em vez de ser posto uma vez só.
  const fechar = useRef(onDismiss)
  fechar.current = onDismiss
  useEffect(() => {
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') fechar.current()
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [])

  return (
    <div className="onboarding-overlay" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
      <div className="onboarding-modal">
        <div className="onboarding-header">
          <span className="onboarding-icon"><PenLine size={22} color="#fff" /></span>
          <h2 id="onboarding-title">Bem-vindo(a), {studentName}!</h2>
          <p>Sua área do aluno está pronta. Aqui está tudo o que você tem à disposição, num só lugar.</p>
        </div>
        <div className="onboarding-body">
          <div className="onboarding-features">
            {FEATURES.map(({ icon: Icon, label, to }) => (
              <Link to={to} className="onboarding-feature" onClick={onDismiss} key={label}>
                <Icon size={18} />
                <span>{label}</span>
                <ChevronRight size={14} className="onboarding-feature-seta" aria-hidden="true" />
              </Link>
            ))}
          </div>
          <div className="onboarding-actions">
            <Link to="/aulas" className="btn btn-primary" onClick={onDismiss} style={{ justifyContent: 'center' }}>
              Começar pelas aulas
            </Link>
            <button type="button" className="onboarding-skip" onClick={onDismiss}>Explorar por conta própria</button>
          </div>
        </div>
      </div>
    </div>
  )
}
