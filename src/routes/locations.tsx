import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/locations')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/locations"!</div>
}
