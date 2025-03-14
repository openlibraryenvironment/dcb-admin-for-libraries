// src/pages/Login.tsx
import React, { useEffect } from "react";
import { useAuth } from "react-oidc-context";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import LoginIcon from "@mui/icons-material/Login";

const Login: React.FC = () => {
	const auth = useAuth();
	const navigate = useNavigate();

	// If user is already authenticated, redirect to home page
	useEffect(() => {
		if (auth.isAuthenticated) {
			const redirectPath = sessionStorage.getItem("redirectPath") || "/";
			navigate({ to: redirectPath });
		}
	}, [auth.isAuthenticated, navigate]);

	const handleLogin = () => {
		// Store current location
		console.log(window.location.pathname);
		sessionStorage.setItem("redirectPath", "/");
		// Trigger login redirect
		auth.signinRedirect();
	};

	console.log(auth.isAuthenticated);
	console.log(auth);

	if (auth.isLoading) {
		return (
			<Box
				sx={{
					display: "flex",
					justifyContent: "center",
					alignItems: "center",
					minHeight: "100vh",
				}}>
				<CircularProgress />
			</Box>
		);
	}

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
					DCB Admin Login
				</Typography>

				<Typography variant="body1" sx={{ mb: 3, textAlign: "center" }}>
					Please sign in with your library credentials to access the admin
					panel.
				</Typography>

				<Button
					fullWidth
					variant="contained"
					color="primary"
					onClick={handleLogin}
					disabled={auth.isLoading}
					startIcon={<LoginIcon />}
					sx={{ mt: 2 }}>
					Sign in with Keycloak
				</Button>

				{auth.error && (
					<Typography color="error" sx={{ mt: 2 }}>
						Authentication error: {auth.error.message}
					</Typography>
				)}
			</Paper>
		</Box>
	);
};
export const Route = createFileRoute("/login")({
	component: Login,
});
