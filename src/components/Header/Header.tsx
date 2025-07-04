import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { useAuth } from "react-oidc-context";
import LogoutIcon from "@mui/icons-material/Logout";
import { useNavigate, useRouter } from "@tanstack/react-router";
import Button from "@mui/material/Button";
import { useTranslation } from "react-i18next";
import Avatar from "@mui/material/Avatar";
import { Tooltip, useTheme } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { LibrariesQueryData } from "@models/ReactQueryHelperTypes";
import { getLibrary } from "@queries/getLibrary";
import request from "graphql-request";
import { useMemo } from "react";

export const Header = () => {
	const navigate = useNavigate();
	const auth = useAuth();
	const library: string = auth.user?.profile?.library as string; // properly type this
	const { t } = useTranslation();
	const { cfg } = useRouter().options.context as { cfg: any };
	const theme = useTheme();

	const headers = useMemo(
		() => ({
			Authorization: `Bearer ${auth.user?.access_token}`,
		}),
		[auth.user?.access_token]
	);

	const id = auth.user?.profile?.libraryId;
	const code = auth.user?.profile?.code;

	const { data } = useQuery<LibrariesQueryData>({
		queryKey: ["libraryInfo", id, headers, code, cfg.VITE_DCB_API_BASE],
		queryFn: async () =>
			request(
				cfg.VITE_DCB_API_BASE + "/graphql",
				getLibrary,
				{
					query: code ? "agencyCode:" + code : "id:" + id, // Prefer to use the full name, but fall back to the ID if needed
					pagesize: 10,
					pageno: 0,
					orderBy: "fullName",
					order: "DESC",
				},
				headers
			),
		// do the on success here
	});
	const libraryData = data?.libraries?.content?.[0];

	return (
		<AppBar position="static">
			<Toolbar disableGutters>
				<Tooltip title={t("ui.tooltips.logo")}>
					<Button
						variant="outlined"
						href={"/"}
						startIcon={<Avatar src={"/favicon.ico"} />}
					/>
				</Tooltip>

				<Typography
					variant="h6"
					component="div"
					sx={{ flexGrow: 1, color: theme.palette.primary.headerText }}>
					{t("header.title", { library: library ? library : "Libraries" })}
				</Typography>
				{auth.isAuthenticated && auth.user && (
					<Box sx={{ display: "flex", alignItems: "center" }}>
						<Typography
							variant="body2"
							sx={{ mr: 2, color: theme.palette.primary.headerText }}>
							{auth.user.profile?.name || "User"}
						</Typography>
						<Typography
							variant="body2"
							sx={{ mr: 2, color: theme.palette.primary.headerText }}>
							{libraryData?.fullName ? libraryData?.fullName : library}
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
