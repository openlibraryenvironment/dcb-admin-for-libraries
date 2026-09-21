import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Router, RouterProvider } from "@tanstack/react-router";
import { useAuth } from "react-oidc-context";

import { DisplayThemeProvider } from "@components/App/DisplayThemeProvider";

interface AppProps {
	queryClient: QueryClient;
	router: Router<any, any>;
}

export default function App({ queryClient, router }: AppProps) {
	const auth = useAuth();

	return (
		<QueryClientProvider client={queryClient}>
			<DisplayThemeProvider>
				<RouterProvider router={router} context={{ auth }} />
			</DisplayThemeProvider>
		</QueryClientProvider>
	);
}
