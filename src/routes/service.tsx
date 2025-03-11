import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/service")({
	component: ServiceComponent,
});

function ServiceComponent() {
	return <div>Hello "/service"!</div>;
}
