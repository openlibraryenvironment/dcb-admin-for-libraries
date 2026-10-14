import { useEffect, useRef } from "react";
import {
	Outlet,
	createFileRoute,
	redirect,
	useNavigate,
} from "@tanstack/react-router";
import { hasAuthParams, useAuth } from "react-oidc-context";
import { Layout } from "@components/Layout/Layout";
import ReleaseHighlightsOnSignIn from "@components/ReleaseHighlights/ReleaseHighlightsOnSignIn";
import Loading from "@components/Loading/Loading";
import { useTranslation } from "react-i18next";
import { storageKey } from "@helpers/appBase";
import {
	isReadOnly,
	isReadOnlyAllowed,
	READ_ONLY_HOME,
} from "@helpers/readOnlyAccess";

/**
 * Owns the sign-in redirect rather than using withAuthenticationRequired, which
 * re-calls signinRedirect after every failure and never reads `auth.error`:
 * docs/routing.md, "Starting sign-in".
 */
const AuthenticatedLayout = () => {
	const auth = useAuth();
	const navigate = useNavigate();
	const { t } = useTranslation();
	const signinRequested = useRef(false);
	const { signinRedirect } = auth;

	const signInFailed = Boolean(auth.error) && !auth.isAuthenticated;
	const mustSignIn =
		!hasAuthParams() &&
		!auth.isLoading &&
		!auth.activeNavigator &&
		!auth.isAuthenticated &&
		!auth.error;

	useEffect(() => {
		if (!mustSignIn || signinRequested.current) return;
		signinRequested.current = true;
		// Namespaced: sibling apps share one sessionStorage on this origin. The value
		// stays browser-absolute (it includes the base), because it is handed
		// straight to window.location.replace() after the callback.
		sessionStorage.setItem(
			storageKey("afterLoginRedirectPath"),
			window.location.pathname + window.location.search + window.location.hash,
		);
		void signinRedirect();
	}, [mustSignIn, signinRedirect]);

	useEffect(() => {
		if (signInFailed) void navigate({ to: "/login", replace: true });
	}, [signInFailed, navigate]);

	if (!auth.isAuthenticated) {
		return (
			<Loading title={t("login.authenticating")} subtitle={t("ui.info.wait")} />
		);
	}
	return (
		<Layout>
			<Outlet />
			<ReleaseHighlightsOnSignIn />
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
	component: AuthenticatedLayout,
});

interface AuthLike {
	isAuthenticated?: boolean;
	user?: { profile?: { roles?: string[] } } | null;
}
