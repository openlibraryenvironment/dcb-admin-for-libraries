import { pageTitle } from "@helpers/pageTitle";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, type ReactNode } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import Paper from "@mui/material/Paper";
import Button from "@mui/material/Button";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutlined";
import LoginIcon from "@mui/icons-material/Login";
import { useAuth } from "react-oidc-context";
import { clearUserState } from "@helpers/clearUserState";
import { z } from "zod/mini";
import { useTranslation } from "react-i18next";
import { appUrl } from "@helpers/appBase";

// Define the search params to handle the ?loggedOut=true flag
const logoutSearchSchema = z.object({
	loggedOut: z.catch(z.optional(z.boolean()), false),
});

export const Route = createFileRoute("/logout")({
	validateSearch: logoutSearchSchema,
	head: () => ({ meta: [{ title: pageTitle("ui.actions.logout") }] }),
	component: Logout,
});

const Page = ({ children }: { children: ReactNode }) => (
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
				maxWidth: 400,
				width: "100%",
				textAlign: "center",
			}}>
			{children}
		</Paper>
	</Box>
);

function Logout() {
	const auth = useAuth();
	const navigate = useNavigate();
	const { loggedOut } = Route.useSearch();
	const { t } = useTranslation();
	const { signoutRedirect } = auth;

	// Once per mount: a failed signoutRedirect sets auth state, and re-running on that
	// change would retry without end.
	const hasTriggeredLogout = useRef(false);

	const performLogout = useCallback(() => {
		hasTriggeredLogout.current = true;
		clearUserState();
		// Base-scoped: the bare origin serves no app when several are mounted under
		// path prefixes, so Keycloak would return the user to DCB Admin.
		void signoutRedirect({
			post_logout_redirect_uri: appUrl("logout?loggedOut=true"),
		});
	}, [signoutRedirect]);

	useEffect(() => {
		if (loggedOut || auth.isLoading || hasTriggeredLogout.current) return;

		if (auth.isAuthenticated) {
			performLogout();
			return;
		}

		// No session to end, so no redirect will ever come back to say it ended.
		hasTriggeredLogout.current = true;
		clearUserState();
		void navigate({ to: "/logout", search: { loggedOut: true }, replace: true });
	}, [
		auth.isAuthenticated,
		auth.isLoading,
		loggedOut,
		performLogout,
		navigate,
	]);

	if (loggedOut) {
		return (
			<Page>
				<CheckCircleOutlineIcon color="success" sx={{ fontSize: 60, mb: 2 }} />

				<Typography component="h1" variant="h5" sx={{ mb: 2 }}>
					{t("ui.logout.out")}
				</Typography>

				<Typography variant="body1" sx={{ mb: 4 }}>
					{t("ui.logout.success")}
				</Typography>

				<Button
					component={Link}
					to="/login"
					variant="contained"
					color="primary"
					fullWidth
					startIcon={<LoginIcon />}>
					{t("ui.logout.again")}
				</Button>
			</Page>
		);
	}

	// signoutRedirect reports a failure through auth.error rather than by throwing.
	const failed =
		auth.error?.source === "signoutRedirect" && !auth.activeNavigator;

	return (
		<Page>
			<Typography component="h1" variant="h5" sx={{ mb: 3 }}>
				{t("ui.logout.out_current")}
			</Typography>

			{failed ? (
				<>
					<Alert severity="error" sx={{ mb: 2, textAlign: "start" }}>
						{t("ui.logout.failure")}
					</Alert>
					<Button variant="contained" onClick={performLogout}>
						{t("ui.logout.retry")}
					</Button>
				</>
			) : (
				<>
					<CircularProgress
						aria-label={t("ui.logout.out_current")}
						sx={{ my: 2 }}
					/>
					<Typography variant="body1">{t("ui.logout.out_progress")}</Typography>
				</>
			)}
		</Page>
	);
}
