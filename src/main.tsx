import * as React from "react";
import * as ReactDOM from "react-dom/client";
import { ThemeProvider } from "@mui/material/styles";
import { CssBaseline } from "@mui/material";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import theme from "./theme";
import { LicenseInfo } from "@mui/x-license";

LicenseInfo.setLicenseKey(String(import.meta.env.VITE_MUI_X_LICENSE_KEY));

const router = createRouter({
	routeTree,
	defaultPreload: "intent",
	defaultStaleTime: 5000,
	scrollRestoration: true,
});

// Register things for typesafety
declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}

ReactDOM.createRoot(document.getElementById("root")!).render(
	<React.StrictMode>
		<ThemeProvider theme={theme}>
			<CssBaseline />
			<RouterProvider router={router}></RouterProvider>
		</ThemeProvider>
	</React.StrictMode>
);
