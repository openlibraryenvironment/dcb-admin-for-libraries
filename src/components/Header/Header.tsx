import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { useAuth } from "react-oidc-context";
import LogoutIcon from "@mui/icons-material/Logout";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import Button from "@mui/material/Button";
import { useTranslation } from "react-i18next";
import Avatar from "@mui/material/Avatar";
import { Tooltip, useTheme } from "@mui/material";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import request from "graphql-request";
import { getLibraryNames } from "@queries/getLibraryNames";
import { queryKeys } from "@helpers/queryKeys";
import { authHeaders } from "@helpers/auth";
import { LibrariesQueryData } from "@models/ReactQueryHelperTypes";
import { assetUrl } from "@helpers/appBase";
import { useAgencyCodes } from "@/hooks/useAgencyCodes";
import { LibrarySelector } from "@components/Header/LibrarySelector";
import { isReadOnly } from "@helpers/readOnlyAccess";

export const Header = () => {
	const navigate = useNavigate();
	const auth = useAuth();

	// The library currently being looked at, which for almost everybody is their only
	// one - see useAgencyCodes
	const { agencyCode: code } = useAgencyCodes();
	const readOnly = isReadOnly(auth.user?.profile?.roles);

	const { cfg } = useRouter().options.context as { cfg: any };

	const { data } = useQuery<LibrariesQueryData>({
		queryKey: queryKeys.library.name(cfg.VITE_DCB_API_BASE, code ?? ""),
		enabled: Boolean(code) && Boolean(cfg.VITE_DCB_API_BASE),
		placeholderData: keepPreviousData,
		// A library's name changes at the pace of onboarding, and this renders on
		// every page: a staleTime of 0 would refetch it on every navigation.
		staleTime: 5 * 60 * 1000,
		queryFn: async () =>
			request(
				cfg.VITE_DCB_API_BASE + "/graphql",
				getLibraryNames,
				{ query: "agencyCode:" + code, pagesize: 1, pageno: 0 },
				await authHeaders()
			),
	});

	const { t } = useTranslation();
	const theme = useTheme();
	const libraryName = data?.libraries?.content?.[0]?.fullName ?? t("header.library_fallback");

	return (
		<AppBar position="static">
			<Toolbar
				disableGutters
				sx={{ flexWrap: "wrap", columnGap: 1, rowGap: 1, px: { xs: 1, sm: 0 } }}>
				<Tooltip title={t("ui.tooltips.logo")}>
					<Button
						variant="outlined"
						component={Link}
						to="/"
						startIcon={
							<Avatar
								alt={t("ui.tooltips.logo")}
								src={assetUrl("fallback-header.png")}
							/>
						}
					/>
				</Tooltip>

				<Typography
					variant="h6"
					component="div"
					sx={{
						flexGrow: 1,
						minWidth: 0,
						overflowWrap: "anywhere",
						color: (theme.vars || theme).palette.primary.headerText,
					}}>
					{readOnly
						? t("header.title_requesting", { library: libraryName })
						: t("header.title", { library: libraryName })}
				</Typography>
				{auth.isAuthenticated && auth.user && (
					<Box
						sx={{
							display: "flex",
							flexWrap: "wrap",
							alignItems: "center",
							rowGap: 1,
						}}>
						<LibrarySelector />
						<Typography
							variant="body2"
							sx={{ mr: 2, color: (theme.vars || theme).palette.primary.headerText }}>
							{t("header.user", {
								user: auth.user.profile?.name || t("header.user_fallback"),
							})}
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
