import { pageTitle } from "@helpers/pageTitle";
import { useAuth } from "react-oidc-context";
import { createFileRoute } from "@tanstack/react-router";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import LoginIcon from "@mui/icons-material/Login";
import Loading from "@components/Loading/Loading";
import { useTranslation } from "react-i18next";

const Login = () => {
	const auth = useAuth();
	const { t } = useTranslation();

	const handleLogin = () => {
		void auth.signinRedirect();
	};

	if (auth.isLoading) {
		return (
			<Loading title={t("login.loading_title")} subtitle={t("ui.info.wait")} />
		);
	}

	return (
		<Box
			component="main"
			sx={(theme) => ({
				display: "flex",
				justifyContent: "center",
				alignItems: "center",
				minHeight: "100vh",
				backgroundColor: (theme.vars || theme).palette.grey[100],
				// grey[100] is the same near-white in both schemes, which left the
				// dark-mode page a white sheet behind a dark card.
				...theme.applyStyles("dark", {
					backgroundColor: (theme.vars || theme).palette.grey[900],
				}),
			})}>
			<Paper
				elevation={3}
				sx={{
					p: 4,
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					maxWidth: 500,
					width: "100%",
				}}>
				<Typography component="h1" variant="h5" sx={{ mb: 3 }}>
					{t("login.title")}
				</Typography>

				<Typography variant="body1" sx={{ mb: 3, textAlign: "center" }}>
					{t("login.access")}
				</Typography>

				<Button
					fullWidth
					variant="contained"
					color="primary"
					onClick={handleLogin}
					disabled={auth.isLoading}
					startIcon={<LoginIcon />}
					sx={{ mt: 2 }}>
					{t("login.keycloak")}
				</Button>

				{auth.error && (
					<Alert severity="error" sx={{ mt: 2, width: "100%" }}>
						{t("login.error", { message: auth.error.message })}
					</Alert>
				)}
			</Paper>
		</Box>
	);
};
export const Route = createFileRoute("/login")({
	head: () => ({ meta: [{ title: pageTitle("login.title") }] }),
	component: Login,
});
