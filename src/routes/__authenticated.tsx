import {
	Outlet,
	createFileRoute,
	useLocation,
	useNavigate,
} from "@tanstack/react-router";
import { useAuth, withAuthenticationRequired } from "react-oidc-context";
import { Layout } from "@components/Layout/Layout";
import Loading from "@components/Loading/Loading";
import { useTranslation } from "react-i18next";
import { useEffect } from "react";
import { storageKey } from "@helpers/appBase";

const AuthenticatedLayout = () => {
	// This component provides the main app layout (e.g., header, sidebar)
	// for all authenticated pages.
	const auth = useAuth();
	const { t } = useTranslation();
	const navigate = useNavigate();
	const location = useLocation();

	useEffect(() => {
		// If no user, not applicable
		if (!auth.user) {
			return;
		}

		const roles = auth.user.profile?.roles || [];
		const isReadOnly = roles.includes("LIBRARY_READ_ONLY");

		// If user is not read only, not applicable
		if (!isReadOnly) {
			return;
		}
		// If user is read only and trying to access something they shouldn't,  do not allow.
		const isTryingToAccessAllowedPage =
			location.pathname.includes("/requesting/") ||
			location.pathname.includes("logout");

		if (!isTryingToAccessAllowedPage) {
			navigate({
				to: "/requesting",
				replace: true,
			});
		}
	}, [auth.user, location.pathname, navigate]);

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
			// Namespaced: sibling apps share one sessionStorage on this origin.
			// The value stays browser-absolute (it includes the base), because it is
			// handed straight to window.location.replace() after the callback.
			sessionStorage.setItem(
				storageKey("afterLoginRedirectPath"),
				window.location.pathname + window.location.search + window.location.hash
			);
		},
	}),
});
