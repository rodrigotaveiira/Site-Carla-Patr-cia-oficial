import type { LucideIcon } from 'lucide-react'

// Estado vazio desenhado (ícone + título + descrição curta), pra usar no lugar
// de um simples parágrafo cinza quando uma lista ainda não tem nada.
export function EmptyState({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description?: string }) {
  return (
    <div className="designed-empty">
      <span className="designed-empty-icon"><Icon /></span>
      <b>{title}</b>
      {description && <p>{description}</p>}
    </div>
  )
}
