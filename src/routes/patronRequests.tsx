import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/patronRequests')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/patronRequests"!</div>
}
