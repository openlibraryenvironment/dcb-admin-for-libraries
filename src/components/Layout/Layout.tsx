import { useEffect, useState } from "react";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { useAuth } from "react-oidc-context";
import { useTheme } from "@mui/material";
import Box from "@mui/material/Box";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Container from "@mui/material/Container";
import { Header } from "../Header/Header";

interface LayoutProps {
	children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
	const auth = useAuth();
	const navigate = useNavigate();
	const router = useRouter();
	const theme = useTheme();
	const [activeTab, setActiveTab] = useState("/");

	// Update active tab based on current route
	useEffect(() => {
		const currentPath = router.state.location.pathname;
		// Handle trailing slashes by removing them for comparison
		const normalizedPath = currentPath.replace(/\/$/, "") || "/";
		setActiveTab(normalizedPath);
	}, [router.state.location.pathname]);

	const handleTabChange = (_: React.SyntheticEvent, newValue: string) => {
		setActiveTab(newValue);
		navigate({ to: newValue });
	};

	// Define available tabs
	const tabs = [
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
				]
			: []),
		{ label: "ILL - EXPERIMENTAL", value: "/ill/login" },
	];

	return (
		<>
			<Header />
			{auth.isAuthenticated && (
				<Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
					<Tabs
						value={activeTab}
						onChange={handleTabChange}
						aria-label="navigation tabs"
						variant="scrollable"
						sx={{ backgroundColor: theme.palette.secondary.main }}
						scrollButtons="auto"
						color="primary">
						{tabs.map((tab) => (
							<Tab key={tab.value} label={tab.label} value={tab.value} />
						))}
					</Tabs>
				</Box>
			)}
			<Container sx={{ mt: 3, mb: 5 }}>{children}</Container>
		</>
	);
};
