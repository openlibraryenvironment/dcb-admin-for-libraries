import { createFileRoute, Outlet } from "@tanstack/react-router";
import { ILLAuthProvider } from "../lib/illAuth"; // Adjust path as needed

// This route component wraps all child routes (e.g., /ill/login, /ill/patronRequests)
// with the ILLAuthProvider.
export const Route = createFileRoute("/ill")({
	component: () => (
		<ILLAuthProvider>
			<Outlet />
		</ILLAuthProvider>
	),
});
