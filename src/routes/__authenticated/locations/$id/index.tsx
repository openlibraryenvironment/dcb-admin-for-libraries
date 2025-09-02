import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/__authenticated/locations/$id/")({
	component: RouteComponent,
});
// Make this read-only at first
function RouteComponent() {
	return <div>Hello "/locations/$id/"!</div>;
}
