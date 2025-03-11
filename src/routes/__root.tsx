import { createRootRoute, Link, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { CustomLink } from "../components/CustomLink";
import Stack from "@mui/material/Stack";

// Somehow this must become MUI tabs
// Secondary navigation TBC
export const Route = createRootRoute({
	component: () => (
		<>
			<Stack spacing={1}>
				<CustomLink to="/" className="[&.active]:font-bold">
					Home
				</CustomLink>
				<CustomLink to="/service">Service</CustomLink>
				<CustomLink to="/settings">Settings</CustomLink>
				<CustomLink to="/mappings">Mappings</CustomLink>
				<CustomLink to="/patronRequests">Patron requests</CustomLink>
				<CustomLink to="/supplierRequests">Supplier requests</CustomLink>
				<CustomLink to="/contacts">Contacts</CustomLink>
				<CustomLink to="/locations">Locations</CustomLink>
				<CustomLink to="/dataChangeLog">Data change log</CustomLink>
				<CustomLink to="/sharedIndex">Shared index</CustomLink>
			</Stack>
			<hr />
			<Outlet />
			<TanStackRouterDevtools />
		</>
	),
});
