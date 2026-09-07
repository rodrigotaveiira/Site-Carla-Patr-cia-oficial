import { CalendarCheck, ChevronLeft, ChevronRight, PenLine, X } from 'lucide-react'
import type { MonthlyActivity } from '@/lib/weekly-activity'

const WEEKDAY_LETTERS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D']

// Mostra um mês (por padrão o corrente) como uma grade (segunda a domingo),
// com os dias em que o aluno acessou a plataforma marcados, mais um resumo
// de quantas semanas bateram a meta — a mesma pergunta que "Meta semanal"
// responde, só que olhando pro mês inteiro. As setas deixam o aluno navegar
// pra meses anteriores, pra continuar vendo o histórico mesmo depois que o
// mês muda — igual um calendário de verdade.
export function MonthReviewModal({
  monthly, onClose, onNavigate, navigating,
}: {
  monthly: MonthlyActivity
  onClose: () => void
  onNavigate: (direction: -1 | 1) => void
  navigating: boolean
}) {
  const firstOfMonth = new Date(monthly.year, monthly.month - 1, 1)
  const firstWeekday = (firstOfMonth.getDay() + 6) % 7 // 0 = segunda
  const todayISO = new Date().toISOString().slice(0, 10)

  const cells: { day: number; iso: string }[] = []
  for (let day = 1; day <= monthly.daysInMonth; day++) {
    const iso = `${monthly.year}-${String(monthly.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    cells.push({ day, iso })
  }

  const weeksHit = monthly.weeks.filter((week) => week.goalMet).length
  const monthLabelCapitalized = monthly.monthLabel.charAt(0).toUpperCase() + monthly.monthLabel.slice(1)

  return (
    <div className="onboarding-overlay" role="dialog" aria-modal="true" aria-labelledby="month-review-title" onClick={onClose}>
      <div className="month-review-modal" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="month-review-close" onClick={onClose} aria-label="Fechar">
          <X size={18} />
        </button>
        <div className="month-review-header">
          <span className="month-review-icon"><CalendarCheck size={20} color="#fff" /></span>
          <div className="month-review-nav">
            <button
              type="button"
              onClick={() => onNavigate(-1)}
              disabled={navigating || !monthly.canGoBack}
              aria-label="Mês anterior"
            >
              <ChevronLeft size={18} />
            </button>
            <h2 id="month-review-title">{monthLabelCapitalized}</h2>
            <button
              type="button"
              onClick={() => onNavigate(1)}
              disabled={navigating || monthly.isCurrentMonth}
              aria-label="Mês seguinte"
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <p>
            {monthly.completedDates.length} dia(s) de estudo · {weeksHit} de {monthly.weeks.length} semana(s) com a meta batida
          </p>
        </div>
        <div className="month-review-body" style={{ opacity: navigating ? 0.5 : 1 }}>
          <div className="month-review-weekdays">
            {WEEKDAY_LETTERS.map((letter, index) => <span key={`${letter}-${index}`}>{letter}</span>)}
          </div>
          <div className="month-review-grid">
            {Array.from({ length: firstWeekday }).map((_, index) => <span key={`pad-${index}`} className="month-review-pad" />)}
            {cells.map(({ day, iso }) => {
              const isDone = monthly.completedDates.includes(iso)
              const isToday = iso === todayISO
              const isFuture = iso > todayISO
              return (
                <span
                  key={iso}
                  className={isDone ? 'done' : isToday ? 'today' : isFuture ? 'future' : ''}
                  title={isDone ? 'Dia de estudo' : undefined}
                >
                  {isDone ? <PenLine size={13} /> : day}
                </span>
              )
            })}
          </div>
          <p className="month-review-footnote">
            {monthly.isCurrentMonth
              ? weeksHit === 0
                ? 'Nenhuma semana bateu a meta ainda esse mês — cada dia de estudo conta.'
                : weeksHit === monthly.weeks.length
                  ? 'Meta batida em todas as semanas do mês. Constância assim é o que leva à aprovação.'
                  : 'Cada semana com a meta batida é um passo a mais na sua constância.'
              : weeksHit === monthly.weeks.length
                ? 'Meta batida em todas as semanas desse mês. Constância assim é o que leva à aprovação.'
                : 'Use as setas pra rever outros meses do seu histórico de estudo.'}
          </p>
        </div>
      </div>
    </div>
  )
}
