import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { useAuth, withAuthenticationRequired } from "react-oidc-context";
import { Layout } from "@components/Layout/Layout";
import Loading from "@components/Loading/Loading";

const AuthenticatedLayout: React.FC = () => {
	// This component provides the main app layout (e.g., header, sidebar)
	// for all authenticated pages.
	const auth = useAuth();
	if (auth.isLoading) {
		return (
			<Loading title="Authenticating..." subtitle="Please wait a moment" />
		);
	}
	return (
		<Layout>
			<Outlet />
		</Layout>
	);
};

export const Route = createFileRoute("/__authenticated")({
	component: withAuthenticationRequired(AuthenticatedLayout, {
		onBeforeSignin: () => {
			sessionStorage.setItem(
				"afterLoginRedirectPath",
				window.location.pathname + window.location.search + window.location.hash
			);
		},
	}),
});
