import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { useAuth } from "react-oidc-context";
import LogoutIcon from "@mui/icons-material/Logout";
import { useNavigate } from "@tanstack/react-router";
import Button from "@mui/material/Button";
import { useTranslation } from "react-i18next";
import Avatar from "@mui/material/Avatar";
import { Tooltip } from "@mui/material";

export const Header = () => {
	const navigate = useNavigate();
	const auth = useAuth();
	const library: string = auth.user?.profile?.library as string; // properly type this
	const { t } = useTranslation();

	return (
		<AppBar position="static">
			<Toolbar disableGutters>
				<Tooltip title={t("tooltips.logo")}>
					<Button
						variant="outlined"
						href={"/"}
						startIcon={<Avatar src={"/favicon.ico"} />}
					/>
				</Tooltip>

				<Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
					{t("header.title", { library: library })}
				</Typography>
				{auth.isAuthenticated && auth.user && (
					<Box sx={{ display: "flex", alignItems: "center" }}>
						<Typography variant="body2" sx={{ mr: 2 }}>
							{auth.user.profile?.name || "User"}
						</Typography>
						<Typography variant="body2" sx={{ mr: 2 }}>
							{library || "User Library"}
						</Typography>
						<Button
							color="inherit"
							onClick={() => navigate({ to: "/logout" })}
							startIcon={<LogoutIcon />}>
							{t("ui.actions.logout")}
						</Button>
					</Box>
				)}
			</Toolbar>
		</AppBar>
	);
};
