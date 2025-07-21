import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/__authenticated/dataChangeLog')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/dataChangeLog"!</div>
}
