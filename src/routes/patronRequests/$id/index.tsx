import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/patronRequests/$id/")({
	component: RouteComponent,
});

function RouteComponent() {
	return <div>Hello "/patronRequests/$id/"!</div>;
}
