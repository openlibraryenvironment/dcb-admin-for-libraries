import { Outlet, createFileRoute } from "@tanstack/react-router";
import { useAuth, withAuthenticationRequired } from "react-oidc-context";
import { Layout } from "@components/Layout/Layout";
import Loading from "@components/Loading/Loading";
import { useTranslation } from "react-i18next";

const AuthenticatedLayout = () => {
	// This component provides the main app layout (e.g., header, sidebar)
	// for all authenticated pages.
	const auth = useAuth();
	const { t } = useTranslation();
	if (auth.isLoading) {
		return (
			<Loading title={t("login.authenticating")} subtitle={t("ui.info.wait")} />
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
