import { createFileRoute } from "@tanstack/react-router";
import React, { useEffect } from "react";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import Paper from "@mui/material/Paper";
import { useAuth } from "react-oidc-context";
import { useGridStore } from "@/hooks/useDataGridStore";

const Logout: React.FC = () => {
	const auth = useAuth();

	const { clearGridState } = useGridStore();

	// need to make sure this does a full signout - see DCB Admin implementation
	useEffect(() => {
		const performLogout = async () => {
			try {
				// Small delay to show the logout message
				await new Promise((resolve) => setTimeout(resolve, 500));
				clearGridState();
				sessionStorage.removeItem("afterLoginRedirectPath");
				await auth.signoutRedirect();
			} catch (error) {
				console.error("Logout error:", error);
			}
		};

		if (auth.isAuthenticated) {
			performLogout();
		}
	}, [auth]);

	return (
		<Box
			sx={{
				display: "flex",
				justifyContent: "center",
				alignItems: "center",
				minHeight: "100vh",
				backgroundColor: (theme) => theme.palette.grey[100],
			}}>
			<Paper
				elevation={3}
				sx={{
					p: 4,
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					maxWidth: 400,
					width: "100%",
				}}>
				<Typography component="h1" variant="h5" sx={{ mb: 3 }}>
					Signing Out
				</Typography>

				<CircularProgress sx={{ my: 2 }} />

				<Typography variant="body1" sx={{ textAlign: "center" }}>
					You are being signed out securely...
				</Typography>
			</Paper>
		</Box>
	);
};
export const Route = createFileRoute("/logout")({
	component: Logout,
});
