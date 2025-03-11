import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/mappings")({
	component: RouteComponent,
});

function RouteComponent() {
	return <div>Hello "/mappings"!</div>;
}
