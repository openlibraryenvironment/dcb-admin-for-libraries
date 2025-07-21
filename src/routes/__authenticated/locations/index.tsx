import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/__authenticated/locations/")({
	component: RouteComponent,
});

function RouteComponent() {
	return <div>Hello "/locations"!</div>;
}
