import Box from "@mui/material/Box";
import { useTranslation } from "react-i18next";
import Error from "@components/Error/Error";
import { useInsideMain } from "@/hooks/useInsideMain";

/**
 * The router's notFoundComponent. It shows the ADDRESS it failed to match,
 * and offers home rather than back - the previous page is what produced the
 * bad link. Both of those cost real debugging time once: docs/routing.md.
 */
export default function NotFound() {
	const { t } = useTranslation();
	// Bare, this page IS the main landmark; inside Layout there is already one.
	const insideMain = useInsideMain();

	// The BROWSER path, deliberately, not useLocation().pathname - the router
	// strips the deployment base off the latter, and the base is exactly what a
	// reader needs to see when a link under a path prefix has gone wrong.
	const path = window.location.pathname;

	return (
		<Box
			component={insideMain ? "div" : "main"}
			sx={{
				display: "flex",
				justifyContent: "center",
				alignItems: "center",
				// Not 100vh: this renders bare for an unmatched URL, but INSIDE the
				// authenticated Layout - under a header and the tab strip - when a
				// loader throws notFound(). A full viewport height pushes it below
				// the fold in the second case.
				minHeight: "60vh",
				py: 4,
			}}>
			<Error
				title={t("ui.feedback.not_found")}
				message={t("ui.feedback.not_found_message")}
				description={t("ui.feedback.not_found_description", { path })}
				action={t("ui.actions.go_home")}
				goBack="/"
			/>
		</Box>
	);
}
