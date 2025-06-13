import * as React from "react";
import * as ReactDOM from "react-dom/client";
import "./i18n";
import { ThemeProvider } from "@mui/material/styles";
import { CssBaseline } from "@mui/material";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import theme from "./theme";
import { LicenseInfo } from "@mui/x-license";
import { AuthProvider, useAuth } from "react-oidc-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { User } from "oidc-client-ts";
import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";

LicenseInfo.setLicenseKey(String(import.meta.env.VITE_MUI_X_LICENSE_KEY));

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 1000 * 60 * 5, // 5 minutes
			retry: 1,
		},
	},
});

const getBasePath = () => {
  const fullPath = window.location.pathname;
  const matches = fullPath.match(/^\/[^/]+/);
  return matches ? matches[0] : '/';
};

// basename is set this way so we can deploy this app to multiple folders and the app will
// work relative to those folders
const router = createRouter({
	routeTree,
  basepath: getBasePath(),
	defaultPreload: "intent",
	defaultPreloadStaleTime: 0,
	defaultStaleTime: 5000,
	scrollRestoration: true,
	context: {
		auth: undefined!,
		queryClient,
	},
});

// Register things for typesafety
declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}

const oidcConfig = {
	authority: import.meta.env.VITE_KEYCLOAK_URL,
	client_id: import.meta.env.VITE_KEYCLOAK_ID,
	redirect_uri: window.location.origin,
	response_type: "code",
	scope: "openid profile email",
	loadUserInfo: true,
	automaticSilentRenew: true,
	onSigninCallback: (_user: User | void): void => {
		// Remove the query parameters from the URL
		window.history.replaceState({}, document.title, window.location.pathname);
	},
};

function App() {
	const auth = useAuth();

	return (
		<QueryClientProvider client={queryClient}>
			<ThemeProvider theme={theme}>
				<CssBaseline />
				<RouterProvider router={router} context={{ auth }} />
			</ThemeProvider>
		</QueryClientProvider>
	);
}

ReactDOM.createRoot(document.getElementById("root")!).render(
	<React.StrictMode>
		<AuthProvider {...oidcConfig}>
			<App />
		</AuthProvider>
	</React.StrictMode>
);
