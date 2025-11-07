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
import { useMemo } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import request from "graphql-request";
import { getLibrary } from "@queries/getLibrary";
import { LibrariesQueryData } from "@models/ReactQueryHelperTypes";

export const Header = () => {
	const navigate = useNavigate();
	const auth = useAuth();

	const headers = useMemo(
		() => ({
			Authorization: `Bearer ${auth.user?.access_token}`,
		}),
		[auth.user?.access_token]
	);

	const code = auth.user?.profile?.code;
	const isReadOnly = auth.user?.profile?.roles?.includes("LIBRARY_READ_ONLY");

	const { cfg } = useRouter().options.context as { cfg: any };

	const { data } = useQuery<LibrariesQueryData>({
		queryKey: ["libraryInfo", headers, code, cfg.VITE_DCB_API_BASE],
		placeholderData: keepPreviousData,
		queryFn: async () =>
			request(
				cfg.VITE_DCB_API_BASE + "/graphql",
				getLibrary,
				{
					query: "agencyCode:" + code,
					pagesize: 1000,
					pageno: 0,
					orderBy: "fullName",
					order: "DESC",
				},
				headers
			),
		// do the on success here
	});

	const library = data?.libraries?.content?.[0];

	const { t } = useTranslation();
	const theme = useTheme();

	return (
		<AppBar position="static">
			<Toolbar disableGutters>
				<Tooltip title={t("ui.tooltips.logo")}>
					<Button
						variant="outlined"
						href={"/"}
						startIcon={<Avatar src={"/fallback-header.png"} />}
					/>
				</Tooltip>

				<Typography
					variant="h6"
					component="div"
					sx={{ flexGrow: 1, color: theme.palette.primary.headerText }}>
					{isReadOnly
						? t("header.title_requesting", {
								library: library ? library?.fullName : "Libraries",
							})
						: t("header.title", {
								library: library ? library?.fullName : "Libraries",
							})}
				</Typography>
				{auth.isAuthenticated && auth.user && (
					<Box sx={{ display: "flex", alignItems: "center" }}>
						<Typography
							variant="body2"
							sx={{ mr: 2, color: theme.palette.primary.headerText }}>
							{t("header.user", { user: auth.user.profile?.name || "User" })}
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
