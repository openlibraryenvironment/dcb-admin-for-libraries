import { useEffect, useMemo, useState } from "react";
import { useLocation, useRouter } from "@tanstack/react-router";
import { useAuth } from "react-oidc-context";
import { useTheme } from "@mui/material";
import Box from "@mui/material/Box";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Container from "@mui/material/Container";
import { Header } from "../Header/Header";
import { CustomLink } from "@components/CustomLink";
import { useTranslation } from "react-i18next";

interface LayoutProps {
	children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
	const auth = useAuth();
	const theme = useTheme();
	const { pathname } = useLocation();
	const router = useRouter();
	const { cfg } = router.options.context;
	const basePath = cfg?.VITE_PUBLIC_URL || "/";
	const [activeTab, setActiveTab] = useState<string | false>(basePath);
	const { t } = useTranslation();

	// Tabs below marked with import.meta.env.DEV means that these tabs will only show up in DEV mode,
	// remove the conditon to make then show up in prod.
	const tabsConfig = useMemo(() => {
		return [
			{ label: t("nav.home.title"), value: basePath },
			{ label: t("nav.titles.title"), value: `${basePath}indexes/mobius` },
			{ label: t("nav.library.service"), value: `${basePath}service` },
			{ label: t("nav.settings.title"), value: `${basePath}settings` },
			{
				label: t("nav.patron_requests.title"),
				value: `${basePath}patronRequests`,
			},
			{ label: t("nav.mappings.title"), value: `${basePath}mappings` },
			{
				label: t("nav.supplier_requests.title"),
				value: `${basePath}supplierRequests`,
			},
			// ...(import.meta.env.DEV
			// 	? [
			// 			{ label: t("nav.contacts.title"), value: `${basePath}contacts` },
			// 			{ label: t("nav.locations.title"), value: `${basePath}locations` },
			// 			{
			// 				label: t("nav.data_change_log.title"),
			// 				value: `${basePath}dataChangeLog`,
			// 			},
			// 			{ label: t("nav.ill.title"), value: `${basePath}ill/login` },
			// 		]
			// 	: []),
		];
	}, [basePath]); // This will only re-calculate if the basePath changes

	// This effect sets the active tab based on the current route
	useEffect(() => {
		// Find exact matches first
		const exactMatch = tabsConfig.find((tab) => tab.value === pathname);
		if (exactMatch) {
			setActiveTab(exactMatch.value);
		} else {
			// Then use best matching for nested routes etc
			const bestMatch = tabsConfig
				.filter((tab) => pathname.startsWith(tab.value))
				.sort((a, b) => b.value.length - a.value.length)[0];
			if (bestMatch) {
				setActiveTab(bestMatch.value);
			} else {
				// If no match is found at all, set no tab as active.
				// Useful warning indicator that something isn't right (maybe base path isn't set correctly etc)
				setActiveTab(false);
			}
		}
	}, [pathname]);

	return (
		<>
			<Header />
			{auth.isAuthenticated && (
				<Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
					<Tabs
						value={activeTab}
						aria-label="navigation tabs"
						variant="scrollable"
						sx={{ backgroundColor: theme.palette.secondary.main }}
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
