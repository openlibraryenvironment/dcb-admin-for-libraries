import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/contacts")({
	beforeLoad: ({ context, location }) => {
		// If the user is not authenticated, redirect them to the login page.
		// We pass the current path as a 'redirect' search parameter.
		// testing
		if (!context.auth.isAuthenticated) {
			throw redirect({
				to: "/login",
				search: {
					redirect: location.href,
				},
			});
		}
	},
	component: RouteComponent,
});

function RouteComponent() {
	return <div>Hello "/contacts"!</div>;
}
