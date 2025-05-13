import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/locations/$id/")({
	component: RouteComponent,
});

function RouteComponent() {
	return <div>Hello "/locations/$id/"!</div>;
}
