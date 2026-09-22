import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { useAuth, withAuthenticationRequired } from "react-oidc-context";
import { Layout } from "@components/Layout/Layout";
import Loading from "@components/Loading/Loading";
import { useTranslation } from "react-i18next";
import { storageKey } from "@helpers/appBase";
import {
	isReadOnly,
	isReadOnlyAllowed,
	READ_ONLY_HOME,
} from "@helpers/readOnlyAccess";

const AuthenticatedLayout = () => {
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
	/**
	 * `isAuthenticated` false means UNDECIDABLE, not "no roles": on a cold load
	 * this runs before the OIDC session is restored, and App.tsx invalidates the
	 * router so it runs again. Why the guard is here and not in an effect:
	 * docs/routing.md.
	 */
	beforeLoad: ({ context, location }) => {
		const auth = (context as { auth?: AuthLike })?.auth;
		if (!auth?.isAuthenticated) return;
		if (!isReadOnly(auth.user?.profile?.roles)) return;
		if (isReadOnlyAllowed(location.pathname)) return;

		throw redirect({ to: READ_ONLY_HOME, replace: true });
	},
	component: withAuthenticationRequired(AuthenticatedLayout, {
		onBeforeSignin: () => {
			// Namespaced: sibling apps share one sessionStorage on this origin.
			// The value stays browser-absolute (it includes the base), because it is
			// handed straight to window.location.replace() after the callback.
			sessionStorage.setItem(
				storageKey("afterLoginRedirectPath"),
				window.location.pathname + window.location.search + window.location.hash,
			);
		},
	}),
});

interface AuthLike {
	isAuthenticated?: boolean;
	user?: { profile?: { roles?: string[] } } | null;
}
