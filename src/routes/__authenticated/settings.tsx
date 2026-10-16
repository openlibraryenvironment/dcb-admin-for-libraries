import { createFileRoute, redirect } from "@tanstack/react-router";

// Renamed Preferences in 2.0; kept so a bookmark to the old address still arrives
export const Route = createFileRoute("/__authenticated/settings")({
	beforeLoad: () => {
		throw redirect({ to: "/preferences", replace: true });
	},
});
