import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/sharedIndex/$id/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/sharedIndex/$id"!</div>
}
