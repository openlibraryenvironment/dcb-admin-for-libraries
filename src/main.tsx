import * as React from "react";
import * as ReactDOM from "react-dom/client";
import "./i18n";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import theme from "./theme";
import { LicenseInfo } from "@mui/x-license";
import { AuthProvider } from "react-oidc-context";
import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
import App from "@components/App/App";
import { User } from "oidc-client-ts";
import {
	BASE,
	appPath,
	appUrl,
	storageKey,
	toRoutePath,
} from "@helpers/appBase";

// declare module "@tanstack/react-router" {
// 	interface Register {
// 		router: typeof router;
// 	}
// }
async function getCfg() {
	try {
		// We need to support runtime configuration as well as build time config. When using
		// build time config variables come via import.meta.env.VITE_MUI_X_LICENSE_KEY
		// When using deploy time, cloudflare will inject inject_env.json into the deployment
		// to read these values.
		//
		// Base-scoped, not "/inject_env.json": the origin may host several apps under
		// path prefixes, and a root-relative fetch gives the worker no way to tell
		// which of them is asking - it redirects to the default app, and we parse
		// that app's HTML shell as JSON.
		const response = await fetch(`${BASE}inject_env.json`, {
			cache: "no-store",
		});

		// File not supplied, OR, server helpfully returning the SPA bundle root doc
		if (
			!response.ok ||
			response.headers.get("Content-Type")?.includes("text/html")
		) {
			return {
				VITE_MUI_X_LICENSE_KEY: String(import.meta.env.VITE_MUI_X_LICENSE_KEY),
				VITE_KEYCLOAK_URL: String(import.meta.env.VITE_KEYCLOAK_URL),
				VITE_KEYCLOAK_ID: String(import.meta.env.VITE_KEYCLOAK_ID),
				VITE_DCB_API_BASE: String(import.meta.env.VITE_DCB_API_BASE),
				VITE_DCB_SEARCH_BASE: String(import.meta.env.VITE_DCB_SEARCH_BASE),
			};
		}

		return await response.json();
	} catch (err) {
		console.warn("Could not load inject_env.json:", err);
		return {};
	}
}

const handleServiceErrors = (error: any) => {
	// For errors from DCB Service / Locate when something is wrong downstream
	// Maintenance and generic network error only at the moment
	// Don't need to do anything if we are already on the maintenance page
	const isNetworkError =
		error.message?.includes("Failed to fetch") ||
		error.message?.includes("Network request failed") ||
		error.message?.includes("NetworkError");
	const isServiceUnavailable = error?.response?.status === 503;

	// Router path: window.location.pathname carries the base, so a raw comparison
	// against "/maintenance" never matches once the app is mounted under a prefix,
	// and the guard against redirect loops stops guarding.
	if (toRoutePath() === "/maintenance") {
		return;
	}

	// Base-scoped hard navigations. A bare "/maintenance" leaves this app entirely:
	// on an origin hosting several apps the worker redirects the root to the
	// DEFAULT app, so a 503 here would dump the user into DCB Admin.
	if (isServiceUnavailable) {
		window.location.href = appPath("maintenance");
	}
	if (isNetworkError) {
		window.location.href = appPath("networkError");
	}
};

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 1000 * 60 * 5, // 5 minutes
			retry: 1,
		},
	},
	queryCache: new QueryCache({
		onError: (error) => handleServiceErrors(error),
	}),
	// Global error handler for Mutations (Writes)
	mutationCache: new MutationCache({
		onError: (error) => handleServiceErrors(error),
	}),
});

async function bootstrap() {
	// See if there is an injected_cfg.json, otherwise fall back to build time variables.
	const cfg = await getCfg();
	const router = createRouter({
		routeTree,
		// Build-time constant, NOT runtime config: it must be the exact value Vite
		// used for the asset base, or the router mounts at a path from which its
		// own assets do not resolve. Set via VITE_PUBLIC_URL at build time.
		basepath: BASE,
		defaultPreload: "intent",
		defaultPreloadStaleTime: 0,
		defaultStaleTime: 5000,
		scrollRestoration: true,
		context: {
			cfg: undefined!,
			auth: undefined!,
			queryClient,
		},
	});

	// Register things for typesafety

	// Nice feature of tanstack etc - inject our config bundle into the router context
	// Retrieve with  const { cfg } = useRouter().options.context;
	router.update({
		context: {
			...router.options.context, // Spreads the existing context (auth, queryClient)
			cfg, // Adds the new cfg object to it
		},
	});
	LicenseInfo.setLicenseKey(cfg.VITE_MUI_X_LICENSE_KEY);

	const oidcConfig = {
		authority: cfg.VITE_KEYCLOAK_URL,
		client_id: cfg.VITE_KEYCLOAK_ID,
		// The app's own base, not the bare origin: where several apps are mounted
		// under path prefixes, the origin root serves none of them - the worker
		// redirects it to the default app, and this app's callback lands there.
		redirect_uri: appUrl(),
		post_logout_redirect_uri: appUrl(),
		response_type: "code",
		scope: "openid profile email",
		loadUserInfo: true,
		automaticSilentRenew: true,
		onSigninCallback: (_user: User | void): void => {
			const isReadOnly = _user?.profile?.roles?.includes("LIBRARY_READ_ONLY");
			const afterLoginRedirectPath = sessionStorage.getItem(
				storageKey("afterLoginRedirectPath"),
			);
			if (isReadOnly) {
				// If user is LIBRARY_READ_ONLY, they can only access requesting.
				// So they don't get their after login redirect path
				// Although if it is a sub path we could save it
				window.location.replace(appPath("requesting"));
				return;
			}
			if (afterLoginRedirectPath) {
				sessionStorage.removeItem(storageKey("afterLoginRedirectPath"));
				// Already browser-absolute: it was captured from
				// window.location.pathname, which includes the base.
				window.location.replace(afterLoginRedirectPath);
			} else {
				window.history.replaceState(
					{},
					document.title,
					window.location.pathname,
				);
			}
		},
	};

	ReactDOM.createRoot(document.getElementById("root")!).render(
		<React.StrictMode>
			<AuthProvider {...oidcConfig}>
				<App theme={theme} queryClient={queryClient} router={router} />
			</AuthProvider>
		</React.StrictMode>,
	);
}

// Some reworking here to allow the app to load config from /injected_env.json before
// proceeding to booting the rest of the SPA. This allows runtime deployment to cloudflare,
// and for different domain names (clouflare workers) to inject different config blocks.
bootstrap();
