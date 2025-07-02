import {
	createRootRoute,
	createRootRouteWithContext,
	// createRootRouteWithContext,
	Outlet,
	useNavigate,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
// import { CustomLink } from "./components/CustomLink";

import { useEffect, useState } from "react";

import Box from "@mui/material/Box";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Container from "@mui/material/Container";
import CircularProgress from "@mui/material/CircularProgress";
// import { AuthContextProps, useAuth } from "react-oidc-context";
import { AuthContextProps, useAuth } from "react-oidc-context";
import { Header } from "../components/Header/Header";
import { QueryClient } from "@tanstack/react-query";
import { useTheme } from "@mui/material";

// export const Route = createRootRouteWithContext<{
// 	auth: AuthContextProps;
// 	cfg: any; // to be investigated as it could be a better way of handling context

interface AppRouterContext {
	queryClient: QueryClient;
	auth: AuthContextProps; // This is the type for the OIDC auth context
	cfg: any; // The runtime config object
}

export const Route = createRootRouteWithContext<AppRouterContext>()({
	component: () => {
		const auth = useAuth();
		const navigate = useNavigate();
		const [activeTab, setActiveTab] = useState("/");
		const theme = useTheme();

		const library: string = auth.user?.profile?.library as string; // properly type this
		console.log(library);
		useEffect(() => {
			// Set active tab based on current path
			setActiveTab(window.location.pathname);
		}, []);

		// Move navigation logic into `useEffect` temporarily
		useEffect(() => {
			if (!auth.isAuthenticated && !auth.isLoading) {
				navigate({ to: "/login" });
			}
		}, [auth.isAuthenticated, auth.isLoading, navigate]);

		const handleTabChange = (_: React.SyntheticEvent, newValue: string) => {
			setActiveTab(newValue);
			navigate({ to: newValue });
		};

		// Handle authentication callback
		if (
			window.location.pathname.startsWith("/callback") ||
			window.location.search.includes("code=")
		) {
			return (
				<Box
					sx={{
						display: "flex",
						justifyContent: "center",
						alignItems: "center",
						height: "100vh",
					}}>
					<CircularProgress />
				</Box>
			);
		}

		// Public routes - no authentication required
		if (
			window.location.pathname === "/login" ||
			window.location.pathname === "/logout"
		) {
			return <Outlet />;
		}

		// // Check if authenticated
		// if (!auth.isAuthenticated && !auth.isLoading) {
		// 	// Redirect to login
		// 	navigate({ to: "/login" });
		// 	return null;
		// } // MAY BE CAUSING ISSUES

		// Loading state
		if (auth.isLoading) {
			return (
				<Box
					sx={{
						display: "flex",
						justifyContent: "center",
						alignItems: "center",
						height: "100vh",
					}}>
					<CircularProgress />
				</Box>
			);
		}

		// Tabs below marked with import.meta.env.DEV means that these tabs will only show up in DEV mode,
		// remove the conditon to make then show up in prod.

		// Authenticated UI
		// Review these tabs as we are running into issues with relative URLs.
		// Not sure if these should be here.
		return (
			<>
				<Header />
				{auth.isAuthenticated && (
					<Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
						<Tabs
							value={activeTab}
							onChange={handleTabChange}
							aria-label="navigation tabs"
							variant="scrollable"
							sx={{ backgroundColor: theme.palette.secondary.main }} // customise tab variants - secondary should always have the colour and white text
							scrollButtons="auto">
							<Tab label="Home" value="/" />
							<Tab label="MOBIUS index" value="/indexes/mobius" />
							<Tab label="Service" value="/service" />
							<Tab label="Settings" value="/settings" />
							{import.meta.env.DEV && (
								<Tab label="Mappings" value="/mappings" />
							)}
							{import.meta.env.DEV && (
								<Tab label="Patron Requests" value="/patronRequests" />
							)}
							{import.meta.env.DEV && (
								<Tab label="Supplier Requests" value="/supplierRequests" />
							)}
							{import.meta.env.DEV && (
								<Tab label="Contacts" value="/contacts" />
							)}
							{import.meta.env.DEV && (
								<Tab label="Locations" value="/locations" />
							)}
							{import.meta.env.DEV && (
								<Tab label="Data Change Log" value="/dataChangeLog" />
							)}
							{/* {import.meta.env.DEV && (
								<Tab label="ILL - EXPERIMENTAL" value="/ill/patronRequests" />
							)} */}
							<Tab label="ILL - EXPERIMENTAL" value="/ill/login" />{" "}
							{/** When redirect is sorted out, this will point to patron requests */}
						</Tabs>
					</Box>
				)}

				<Container sx={{ mt: 3, mb: 5 }}>
					<Outlet />
				</Container>

				{process.env.NODE_ENV !== "production" && <TanStackRouterDevtools />}
			</>
		);
	},
});
