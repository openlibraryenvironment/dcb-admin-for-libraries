import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/sharedIndex")({
	component: RouteComponent,
});

function RouteComponent() {
	return <div>Hello "/sharedIndex"!</div>;
}
