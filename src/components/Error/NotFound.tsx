import Box from "@mui/material/Box";
import { useTranslation } from "react-i18next";
import Error from "@components/Error/Error";

/**
 * The router's notFoundComponent: every URL that matches no route, and every
 * `notFound()` a loader throws.
 *
 * TanStack's built-in fallback is the bare string "Not Found" - no heading, no
 * address, and no way out of the dead end but the back button. That is what
 * made a doubled base path hard to place (see e2e-base-path/navigation.spec.ts):
 * the app reported the symptom without reporting the address it had failed to
 * match, so the doubled segment was only visible in devtools.
 *
 * The way out is home, not "go back": the previous page is what produced the
 * bad link, so returning to it re-offers the same dead end.
 */
export default function NotFound() {
	const { t } = useTranslation();

	// The BROWSER path, deliberately, not useLocation().pathname - the router
	// strips the deployment base off the latter, and the base is exactly what a
	// reader needs to see when a link under a path prefix has gone wrong.
	const path = window.location.pathname;

	return (
		<Box
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
