import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/supplierRequests')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/supplierRequests"!</div>
}
