import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Router, RouterProvider } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "react-oidc-context";

import { DisplayThemeProvider } from "@components/App/DisplayThemeProvider";
import { storageKey } from "@helpers/appBase";

interface AppProps {
	queryClient: QueryClient;
	router: Router<any, any>;
}

export default function App({ queryClient, router }: AppProps) {
	const auth = useAuth();

	/**
	 * Passing `context` to RouterProvider updates what beforeLoad will SEE, but
	 * does not re-run it for matches that have already resolved. On a cold load
	 * every guard therefore runs before react-oidc-context has restored the
	 * session, decides it cannot judge, and is never asked again.
	 *
	 * Invalidating once the session settles is what makes a route guard
	 * authoritative rather than advisory. docs/routing.md.
	 */
	useEffect(() => {
		if (auth.isLoading) return;
		void router.invalidate();
	}, [auth.isLoading, auth.isAuthenticated, auth.user, router]);

	// Raised only once silent renewal has failed (an SSO session past its maximum, a tab left
	// overnight). Every request would now be refused, so sign in again and come back here.
	const { events, signinRedirect } = auth;
	useEffect(
		() =>
			events.addAccessTokenExpired(() => {
				sessionStorage.setItem(
					storageKey("afterLoginRedirectPath"),
					window.location.pathname + window.location.search + window.location.hash,
				);
				void signinRedirect();
			}),
		[events, signinRedirect],
	);

	return (
		<QueryClientProvider client={queryClient}>
			<DisplayThemeProvider>
				<RouterProvider router={router} context={{ auth }} />
			</DisplayThemeProvider>
		</QueryClientProvider>
	);
}
