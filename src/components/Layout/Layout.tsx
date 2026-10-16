import { useMemo } from "react";
import { useLocation } from "@tanstack/react-router";
import { useAuth } from "react-oidc-context";
import Box from "@mui/material/Box";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Container from "@mui/material/Container";
import { Header } from "../Header/Header";
import { CustomLink } from "@components/CustomLink";
import { useTranslation } from "react-i18next";
import { matchActiveTab } from "@helpers/activeTab";
import { isInsightsEnabled } from "@helpers/featureFlags";
import { MAIN_CONTENT_ID } from "@constants/landmarks";
import { SkipLink } from "./SkipLink";
import { useRouteAnnouncement } from "@/hooks/useRouteAnnouncement";
import { InsideMainContext } from "@/hooks/useInsideMain";
import { isReadOnly } from "@helpers/readOnlyAccess";

interface LayoutProps {
	children: React.ReactNode;
}

/**
 * Router paths, NOT browser paths. The router owns the deployment base: it
 * strips it from `useLocation().pathname` and re-adds it to every `to` it
 * renders. Prefixing these with getAppBase() double-counts it, which is how
 * /dcb-admin-for-libraries-dev/dcb-admin-for-libraries-dev/requesting - a
 * "Not Found" - gets built, and why nothing ever matched the location.
 */
const TAB_PATHS = {
	home: "/",
	library: "/library",
	requesting: "/requesting",
	patronRequests: "/patronRequests",
	supplierRequests: "/supplierRequests",
	service: "/service",
	mappings: "/mappings",
	locations: "/locations",
	bibs: "/bibs",
	insights: "/insights",
	preferences: "/preferences",
} as const;

export const Layout = ({ children }: LayoutProps) => {
	const auth = useAuth();
	const { pathname } = useLocation();
	const { t } = useTranslation();

	useRouteAnnouncement();

	const tabsReadOnly = useMemo(() => {
		return [
			{ label: t("nav.requesting.title"), value: TAB_PATHS.requesting },
			{ label: t("nav.preferences.title"), value: TAB_PATHS.preferences },
		];
	}, [t]);

	// Non-admin users see only the read-only tabs; the route guard keeps them to those pages.
	const tabsConfig = useMemo(() => {
		return !isReadOnly(auth?.user?.profile?.roles)
			? [
					{ label: t("nav.home.title"), value: TAB_PATHS.home },
					{ label: t("nav.library.title"), value: TAB_PATHS.library },
					{
						label: t("nav.requesting.title"),
						value: TAB_PATHS.requesting,
					},
					{
						label: t("nav.patron_requests.title"),
						value: TAB_PATHS.patronRequests,
					},
					{
						label: t("nav.supplier_requests.title"),
						value: TAB_PATHS.supplierRequests,
					},
					{ label: t("nav.library.service"), value: TAB_PATHS.service },
					{ label: t("nav.mappings.title"), value: TAB_PATHS.mappings },
					{ label: t("nav.locations.title"), value: TAB_PATHS.locations },
					{ label: t("nav.bibs.title"), value: TAB_PATHS.bibs },
					// Insights is hidden until the environment's dcb-service serves the
					// statistics endpoints. The route guards the typeable URL as well -
					// hiding a tab is UX, not access control.
					...(isInsightsEnabled()
						? [{ label: t("nav.insights.title"), value: TAB_PATHS.insights }]
						: []),
					{ label: t("nav.preferences.title"), value: TAB_PATHS.preferences },
				]
			: tabsReadOnly;
	}, [auth?.user?.profile?.roles, t, tabsReadOnly]);

	// Derived from the location, not synced into state by an effect: an effect
	// renders one frame with the previous tab lit before correcting itself.
	// `false` when no tab owns the route, which is MUI's "no indicator" value
	// and a useful signal that a route is missing from the config.
	const activeTab = useMemo(
		() =>
			matchActiveTab(
				pathname,
				tabsConfig.map((tab) => tab.value),
			),
		[pathname, tabsConfig],
	);

	return (
		<>
			<SkipLink />
			<Header />
			{auth.isAuthenticated && (
				<Box
					component="nav"
					aria-label={t("a11y.navigation")}
					sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
					<Tabs
						value={activeTab}
						variant="scrollable"
						scrollButtons="auto"
						// MUI hides them below sm unless asked, and the cut-off tab was the only sign there was more
						allowScrollButtonsMobile>
						{tabsConfig.map((tab) => (
							<Tab
								key={tab.value}
								label={tab.label}
								value={tab.value}
								// Use the Link component for navigation
								component={CustomLink}
								to={tab.value}
							/>
						))}
					</Tabs>
				</Box>
			)}
			<Container
				component="main"
				id={MAIN_CONTENT_ID}
				// Focusable only as a skip-link target: without it the browser moves
				// the page but not the focus, and the next Tab returns to the header.
				tabIndex={-1}
				sx={{ mt: 3, mb: 5 }}>
				<InsideMainContext.Provider value={true}>
					{children}
				</InsideMainContext.Provider>
			</Container>
		</>
	);
};
