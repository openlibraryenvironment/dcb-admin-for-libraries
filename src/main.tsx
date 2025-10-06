import * as React from "react";
import * as ReactDOM from "react-dom/client";
import "./i18n";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import theme from "./theme";
import { LicenseInfo } from "@mui/x-license";
import { AuthProvider } from "react-oidc-context";
import { QueryClient } from "@tanstack/react-query";
import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
import App from "@components/App/App";
import { User } from "oidc-client-ts";

// declare module "@tanstack/react-router" {
// 	interface Register {
// 		router: typeof router;
// 	}
// }
async function getCfg() {
	try {
		// We need to support runtime configuration as well as build time config. When using
		// build time config variables come via import.meta.env.VITE_MUI_X_LICENSE_KEY
		// When using deploy time, cloudflare will inject inject_env.js into the deployment
		// to read these values.
		const response = await fetch("/inject_env.json", { cache: "no-store" });

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
				VITE_ILL_API_BASE: String(import.meta.env.VITE_ILL_API_BASE),
				VITE_PUBLIC_URL: String(import.meta.env.VITE_PUBLIC_URL),
			};
		}

		return await response.json();
	} catch (err) {
		console.warn("Could not load inject_env.json:", err);
		return {};
	}
}

// Re-working this to use an environment variable for the time being.
// As this method was causing difficulties when navigating from inner routes
// i.e. navigation from /patronRequests to /mappings was becoming /patronRequests/mappings
// Thus making navigation difficult
// const getBasePath = () => {
// 	const fullPath = window.location.pathname;
// 	const matches = fullPath.match(/^\/[^/]+/);
// 	return matches ? matches[0] : "/";
// };

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 1000 * 60 * 5, // 5 minutes
			retry: 1,
		},
	},
});

// basename is set this way so we can deploy this app to multiple folders and the app will
// work relative to those folders
// Now uses env variable to tackle issue above. A temp fix for now.
// Unfortunately my fix is also necessitating specifying base path in index.html - we definitely need a better way of doing it
// const bp = String(import.meta.env.VITE_PUBLIC_URL);
// console.log(bp);

async function bootstrap() {
	// See if there is an injected_cfg.json, otherwise fall back to build time variables.
	const cfg = await getCfg();
	const router = createRouter({
		routeTree,
		// basepath: getBasePath(),
		basepath: cfg.VITE_PUBLIC_URL || "/",
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
		redirect_uri: window.location.origin,
		response_type: "code",
		scope: "openid profile email",
		loadUserInfo: true,
		automaticSilentRenew: true,
		onSigninCallback: (_user: User | void): void => {
			console.log("Sign in for ", _user);
			const isReadOnly = _user?.profile?.roles?.includes("LIBRARY_READ_ONLY");
			const afterLoginRedirectPath = sessionStorage.getItem(
				"afterLoginRedirectPath"
			);
			if (isReadOnly) {
				// If user is LIBRARY_READ_ONLY, they can only access requesting.
				// So they don't get their after login redirect path
				// Although if it is a sub path we could save it
				window.location.replace("/requesting");
				return;
			}
			if (afterLoginRedirectPath) {
				sessionStorage.removeItem("afterLoginRedirectPath");
				window.location.replace(afterLoginRedirectPath);
			} else {
				window.history.replaceState(
					{},
					document.title,
					window.location.pathname
				);
			}
		},
	};

	ReactDOM.createRoot(document.getElementById("root")!).render(
		<React.StrictMode>
			<AuthProvider {...oidcConfig}>
				<App theme={theme} queryClient={queryClient} router={router} />
			</AuthProvider>
		</React.StrictMode>
	);
}

// Some reworking here to allow the app to load config from /injected_env.json before
// proceeding to booting the rest of the SPA. This allows runtime deployment to cloudflare,
// and for different domain names (clouflare workers) to inject different config blocks.
bootstrap();
