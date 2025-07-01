import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useILLAuth } from "../lib/illAuth";
import { useState, useEffect } from "react";
import {
	Container,
	Box,
	TextField,
	Button,
	Typography,
	Alert,
	CircularProgress,
} from "@mui/material";
import z from "zod";

const loginSearchSchema = z.object({
	redirect: z.string().optional().catch(""),
});

export const Route = createFileRoute("/ill/login")({
	validateSearch: loginSearchSchema,
	component: ILLLoginComponent,
});

function ILLLoginComponent() {
	const { loginILL, isILLAuthenticated } = useILLAuth();
	const navigate = useNavigate();
	const { redirect } = Route.useSearch();

	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);

	console.log(isILLAuthenticated);
	useEffect(() => {
		if (isILLAuthenticated) {
			navigate({ to: redirect || "/ill/patronRequests" });
		}
	}, [isILLAuthenticated, navigate, redirect]);

	// This function has been corrected
	const handleLogin = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		setIsLoading(true);
		try {
			await loginILL({ username, password });
			// On success, we don't need to do anything here.
			// The useEffect will handle the navigation.
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "An unknown error occurred."
			);
		} finally {
			// This 'finally' block will execute after the 'try' or 'catch' has finished.
			// This guarantees the spinner is always turned off once the API call is complete.
			setIsLoading(false);
		}
	};

	return (
		<Container maxWidth="xs">
			<Box
				sx={{
					marginTop: 8,
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
				}}>
				<Typography component="h1" variant="h5">
					ILL Folio Login
				</Typography>
				<Box component="form" onSubmit={handleLogin} sx={{ mt: 1 }}>
					<TextField
						margin="normal"
						required
						fullWidth
						label="Username"
						value={username}
						onChange={(e) => setUsername(e.target.value)}
					/>
					<TextField
						margin="normal"
						required
						fullWidth
						label="Password"
						type="password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
					/>
					{error && <Alert severity="error">{error}</Alert>}
					<Button
						type="submit"
						fullWidth
						variant="contained"
						sx={{ mt: 3, mb: 2 }}
						disabled={isLoading}>
						{isLoading ? <CircularProgress size={24} /> : "Sign In"}
					</Button>
				</Box>
			</Box>
		</Container>
	);
}
