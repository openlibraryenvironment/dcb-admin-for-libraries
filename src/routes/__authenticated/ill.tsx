import { ILLAuthProvider } from "@/lib/illAuth";
import { createFileRoute, Outlet } from "@tanstack/react-router";

// This route component wraps all child routes (e.g., /ill/login, /ill/patronRequests)
// with the ILLAuthProvider.
export const Route = createFileRoute("/__authenticated/ill")({
	component: () => (
		<ILLAuthProvider>
			<Outlet />
		</ILLAuthProvider>
	),
});
