import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { useAuth } from "react-oidc-context";
import { Layout } from "@components/Layout/Layout";

const AuthenticatedLayout: React.FC = () => {
	// This component provides the main app layout (e.g., header, sidebar)
	// for all authenticated pages.
	return (
		<Layout>
			<Outlet />
		</Layout>
	);
};

export const Route = createFileRoute("/__authenticated")({
	// This function runs BEFORE any component on this route renders.
	beforeLoad: ({ context, location }) => {
		// Pass auth in context
		const auth = (context as any).auth as ReturnType<typeof useAuth>;

		// If the user is not logged in, we will want to redirect them to the login page.
		// But we also want to keep their original destination
		if (!auth.isAuthenticated) {
			// Tanstack Router's 'redirect' helper builds the correct URL.
			throw redirect({
				to: "/login",
				// Pass the user's original destination as a search param.
				search: {
					redirect: location.pathname,
				},
			});
		}
	},
	component: AuthenticatedLayout,
});
