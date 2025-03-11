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
				<CustomLink to="/patronRequests" className="[&.active]:font-bold">
					Patron requests
				</CustomLink>
			</Stack>
			<hr />
			<Outlet />
			<TanStackRouterDevtools />
		</>
	),
});
