import { createRootRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
// import { CustomLink } from "./components/CustomLink";

import { useEffect, useState } from "react";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Container from "@mui/material/Container";
import CircularProgress from "@mui/material/CircularProgress";
import LogoutIcon from "@mui/icons-material/Logout";
import { useAuth } from "react-oidc-context";

export const Route = createRootRoute({
	component: () => {
		const auth = useAuth();
		const navigate = useNavigate();
		const [activeTab, setActiveTab] = useState("/");

		useEffect(() => {
			// Set active tab based on current path
			setActiveTab(window.location.pathname);
		}, []);

		// 🛠️ FIX: Move navigation logic into `useEffect`
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

		// Authenticated UI
		return (
			<>
				<AppBar position="static">
					<Toolbar>
						<Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
							DCB Admin for {auth.user?.profile?.library || "Library"}
						</Typography>
						{auth.isAuthenticated && auth.user && (
							<Box sx={{ display: "flex", alignItems: "center" }}>
								<Typography variant="body2" sx={{ mr: 2 }}>
									{auth.user.profile?.name || "User"}
								</Typography>
								<Typography variant="body2" sx={{ mr: 2 }}>
									{auth?.user.profile?.library || "User"}
								</Typography>
								<Button
									color="inherit"
									onClick={() => navigate({ to: "/logout" })}
									startIcon={<LogoutIcon />}>
									Logout
								</Button>
							</Box>
						)}
					</Toolbar>
				</AppBar>

				{auth.isAuthenticated && (
					<Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
						<Tabs
							value={activeTab}
							onChange={handleTabChange}
							aria-label="navigation tabs"
							variant="scrollable"
							scrollButtons="auto">
							<Tab label="Home" value="/" />
							<Tab label="Service" value="/service" />
							<Tab label="Settings" value="/settings" />
							<Tab label="Mappings" value="/mappings" />
							<Tab label="Patron Requests" value="/patronRequests" />
							<Tab label="Supplier Requests" value="/supplierRequests" />
							<Tab label="Contacts" value="/contacts" />
							<Tab label="Locations" value="/locations" />
							<Tab label="Data Change Log" value="/dataChangeLog" />
							<Tab label="Shared Index" value="/sharedIndex" />
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
