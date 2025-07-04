// src/components/Layout/Layout.tsx

import { useEffect, useState } from "react";
import { useRouter } from "@tanstack/react-router";
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
const TABS_CONFIG = [
	{ label: "Home", value: "/" },
	{ label: "Titles", value: "/indexes/mobius" },
	{ label: "Service", value: "/service" },
	{ label: "Settings", value: "/settings" },
	{ label: "Patron Requests", value: "/patronRequests" },
	{ label: "Mappings", value: "/mappings" },
	...(import.meta.env.DEV
		? [
				{ label: "Supplier Requests", value: "/supplierRequests" },
				{ label: "Contacts", value: "/contacts" },
				{ label: "Locations", value: "/locations" },
				{ label: "Data Change Log", value: "/dataChangeLog" },
				{ label: "ILL - EXPERIMENTAL", value: "/ill/login" },
			]
		: []),
];

export const Layout = ({ children }: LayoutProps) => {
	const auth = useAuth();
	const router = useRouter();
	const theme = useTheme();
	const [activeTab, setActiveTab] = useState("/");

	// This effect correctly sets the active tab based on the current route
	useEffect(() => {
		const currentPath = router.state.location.pathname;

		const bestMatch = TABS_CONFIG.filter((tab) =>
			currentPath.startsWith(tab.value)
		).sort((a, b) => b.value.length - a.value.length)[0];

		if (bestMatch) {
			setActiveTab(bestMatch.value);
		}
		console.log(bestMatch.value);
	}, [router.state.location.pathname]);

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
