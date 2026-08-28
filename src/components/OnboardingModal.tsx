import { Link } from '@tanstack/react-router'
import { CalendarDays, CirclePlay, FileCheck2, PenLine, Target } from 'lucide-react'

const FEATURES = [
  { icon: CirclePlay, label: 'Aulas em vídeo, no seu ritmo' },
  { icon: FileCheck2, label: 'Redações com correção detalhada' },
  { icon: Target, label: 'Simulados com nota na hora' },
  { icon: CalendarDays, label: 'Encontros individuais com a Carla' },
] as const

// Boas-vindas de primeiro acesso: aparece uma única vez, some pra sempre depois do primeiro dismiss.
export function OnboardingModal({ studentName, onDismiss }: { studentName: string; onDismiss: () => void }) {
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
            {FEATURES.map(({ icon: Icon, label }) => (
              <div className="onboarding-feature" key={label}>
                <Icon size={18} />
                <span>{label}</span>
              </div>
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
