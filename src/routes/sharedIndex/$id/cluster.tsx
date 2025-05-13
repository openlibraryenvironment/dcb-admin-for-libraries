import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/sharedIndex/$id/cluster')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/sharedIndex/$id/cluster"!</div>
}
