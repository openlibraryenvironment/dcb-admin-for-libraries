import * as React from "react";
import * as ReactDOM from "react-dom/client";
import "./i18n";
import { createRouter, type AnyRouter } from "@tanstack/react-router";
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
	appPath,
	appUrl,
	getAppBase,
	storageKey,
	toRoutePath,
} from "@helpers/appBase";

declare global {
	interface Window {
		__APP_ENV__?: {
			VITE_MUI_X_LICENSE_KEY?: string;
			VITE_KEYCLOAK_URL?: string;
			VITE_KEYCLOAK_ID?: string;
			VITE_DCB_API_BASE?: string;
			VITE_DCB_SEARCH_BASE?: string;
			[key: string]: string | undefined;
		};
		__DCB_BUNDLE_BASE_URL__?: string;
	}
}

export async function getStandaloneConfig() {
	try {
		if (typeof window !== "undefined" && window.__APP_ENV__) {
			return window.__APP_ENV__;
		}

		// Base-scoped, not "/inject_env.json": the origin may host several apps
		// under path prefixes, and a root-relative fetch gives the worker no way to
		// tell which of them is asking.
		const response = await fetch(`${getAppBase()}inject_env.json`, {
			cache: "no-store",
		});

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

let router: AnyRouter;

const handleServiceErrors = (error: any) => {
	const isNetworkError =
		error.message?.includes("Failed to fetch") ||
		error.message?.includes("Network request failed") ||
		error.message?.includes("NetworkError");
	const isServiceUnavailable = error?.response?.status === 503;

	if (toRoutePath() === "/maintenance") {
		return;
	}

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
			staleTime: 1000 * 60 * 5,
			retry: 1,
		},
	},
	queryCache: new QueryCache({
		onError: (error) => handleServiceErrors(error),
	}),
	mutationCache: new MutationCache({
		onError: (error) => handleServiceErrors(error),
	}),
});

export async function mountDcbAdminForLibraries(
	rootElement: HTMLElement,
	cfg: Record<string, string | undefined>,
): Promise<void> {
	window.__APP_ENV__ = cfg as Window["__APP_ENV__"];

	router = createRouter({
		routeTree,
		basepath: getAppBase(),
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

	router.update({
		context: {
			...router.options.context,
			cfg,
		},
	});

	if (cfg.VITE_MUI_X_LICENSE_KEY) {
		LicenseInfo.setLicenseKey(cfg.VITE_MUI_X_LICENSE_KEY);
	}

	const oidcConfig = {
		authority: cfg.VITE_KEYCLOAK_URL,
		client_id: cfg.VITE_KEYCLOAK_ID,
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
				window.location.replace(appPath("requesting"));
				return;
			}
			if (afterLoginRedirectPath) {
				sessionStorage.removeItem(storageKey("afterLoginRedirectPath"));
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

	if (!rootElement.innerHTML) {
		ReactDOM.createRoot(rootElement).render(
			<React.StrictMode>
				<AuthProvider {...oidcConfig}>
					<App theme={theme} queryClient={queryClient} router={router} />
				</AuthProvider>
			</React.StrictMode>,
		);
	}
}

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}
