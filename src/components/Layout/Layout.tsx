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
	requesting: "/requesting",
	patronRequests: "/patronRequests",
	supplierRequests: "/supplierRequests",
	service: "/service",
	mappings: "/mappings",
	locations: "/locations",
	bibs: "/bibs",
	settings: "/settings",
} as const;

export const Layout = ({ children }: LayoutProps) => {
	const auth = useAuth();
	const { pathname } = useLocation();
	const { t } = useTranslation();

	const tabsReadOnly = useMemo(() => {
		return [
			{ label: t("nav.requesting.title"), value: TAB_PATHS.requesting },
		];
	}, [t]);

	// Library admin check makes sure only requesting tabs show up for non-admin users.
	// Then we need to put the redirect in to make sure they only get directed to that tab.
	const tabsConfig = useMemo(() => {
		return auth?.user?.profile?.roles?.includes("LIBRARY_ADMIN")
			? [
					{ label: t("nav.home.title"), value: TAB_PATHS.home },
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
					{ label: t("nav.settings.title"), value: TAB_PATHS.settings },
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
			<Header />
			{auth.isAuthenticated && (
				<Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
					<Tabs
						value={activeTab}
						aria-label={t("a11y.navigation")}
						variant="scrollable"
						scrollButtons="auto"
						color="primary">
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
			<Container sx={{ mt: 3, mb: 5 }}>{children}</Container>
		</>
	);
};
