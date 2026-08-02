import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/aguardando-aprovacao')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/aguardando-aprovacao"!</div>
}
