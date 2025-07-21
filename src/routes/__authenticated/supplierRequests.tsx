import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/__authenticated/supplierRequests')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/supplierRequests"!</div>
}
