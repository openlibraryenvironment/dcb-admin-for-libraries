import { CssBaseline, Theme, ThemeProvider } from "@mui/material";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Router, RouterProvider } from "@tanstack/react-router";
import { useAuth } from "react-oidc-context";

interface AppProps {
	queryClient: QueryClient;
	theme: Theme;
	router: Router<any, any>;
}
export default function App({ queryClient, theme, router }: AppProps) {
	const auth = useAuth();

	return (
		<QueryClientProvider client={queryClient}>
			{/* noSsr: this is a client-only SPA, so the provider does not need to
			    double-render to guard against a hydration mismatch. Without it, a
			    theme carrying both colour schemes repaints light before dark on
			    every refresh. */}
			<ThemeProvider theme={theme} noSsr>
				<CssBaseline />
				<RouterProvider router={router} context={{ auth }} />
			</ThemeProvider>
		</QueryClientProvider>
	);
}
