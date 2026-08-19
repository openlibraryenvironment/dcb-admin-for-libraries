// import { createFileRoute, redirect } from "@tanstack/react-router";

import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import Typography from "@mui/material/Typography";
export const Route = createFileRoute("/__authenticated/contacts")({
	// beforeLoad: ({ context, location }) => {
	// 	// If the user is not authenticated, redirect them to the login page.
	// 	// We pass the current path as a 'redirect' search parameter.
	// 	// WIP - commented out for testing purposes
	// 	if (!context.auth.isAuthenticated) {
	// 		throw redirect({
	// 			to: "/login",
	// 			search: {
	// 				redirect: location.href,
	// 			},
	// 		});
	// 	}
	// },
	component: RouteComponent,
});

function RouteComponent() {
	const { t } = useTranslation();
	return <Typography variant="body1">{t("ui.info.coming_soon")}</Typography>;
}
