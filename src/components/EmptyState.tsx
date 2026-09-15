import type { LucideIcon } from 'lucide-react'

// Estado vazio desenhado (ícone + título + descrição curta), pra usar no lugar
// de um simples parágrafo cinza quando uma lista ainda não tem nada.
// `alto` é pra quando este estado vazio é o corpo inteiro da página: aí ele
// ocupa a altura que sobraria em branco embaixo. Dentro de card, não use.
export function EmptyState({ icon: Icon, title, description, alto }: { icon: LucideIcon; title: string; description?: string; alto?: boolean }) {
  return (
    <div className={alto ? 'designed-empty alto' : 'designed-empty'}>
      <span className="designed-empty-icon"><Icon /></span>
      <b>{title}</b>
      {description && <p>{description}</p>}
    </div>
  )
}
