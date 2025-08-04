import { useEffect, useState } from "react";
import { useLocation } from "@tanstack/react-router";
import { useAuth } from "react-oidc-context";
import { useTheme } from "@mui/material";
import Box from "@mui/material/Box";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Container from "@mui/material/Container";
import { Header } from "../Header/Header";
import { CustomLink } from "@components/CustomLink";

interface LayoutProps {
	children: React.ReactNode;
}

// Define tabs outside the component so it's a stable constant
// Tabs below marked with import.meta.env.DEV means that these tabs will only show up in DEV mode,
// remove the conditon to make then show up in prod.
const basePath = String(import.meta.env.VITE_PUBLIC_URL);
const TABS_CONFIG = [
	{ label: "Home", value: basePath },
	{ label: "Titles", value: basePath + "indexes/mobius" },
	{ label: "Service", value: basePath + "service" },
	{ label: "Settings", value: basePath + "settings" },
	{ label: "Patron Requests", value: basePath + "patronRequests" },
	{ label: "Mappings", value: basePath + "mappings" },
	...(import.meta.env.DEV
		? [
				{ label: "Supplier Requests", value: basePath + "supplierRequests" },
				{ label: "Contacts", value: basePath + "contacts" },
				{ label: "Locations", value: basePath + "locations" },
				{ label: "Data Change Log", value: basePath + "dataChangeLog" },
				{ label: "ILL - EXPERIMENTAL", value: basePath + "ill/login" },
			]
		: []),
];

export const Layout = ({ children }: LayoutProps) => {
	const auth = useAuth();
	const theme = useTheme();
	const [activeTab, setActiveTab] = useState<string | false>(basePath);
	const { pathname } = useLocation();

	// This effect sets the active tab based on the current route
	useEffect(() => {
		// Find exact matches first
		const exactMatch = TABS_CONFIG.find((tab) => tab.value === pathname);
		if (exactMatch) {
			setActiveTab(exactMatch.value);
		} else {
			// Then use best matching for nested routes etc
			const bestMatch = TABS_CONFIG.filter((tab) =>
				pathname.startsWith(tab.value)
			).sort((a, b) => b.value.length - a.value.length)[0];
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
						{TABS_CONFIG.map((tab) => (
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
