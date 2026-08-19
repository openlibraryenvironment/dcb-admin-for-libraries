import Box from "@mui/material/Box";
import { useTranslation } from "react-i18next";
import type { ErrorComponentProps } from "@tanstack/react-router";
import Error from "@components/Error/Error";

/**
 * The router's defaultErrorComponent: anything a route's loader or component
 * throws that is not a notFound.
 *
 * `error` is accepted and NOT rendered. TanStack's own ErrorComponent prints
 * error.message, and the messages that reach this boundary come from
 * graphql-request, which puts the whole response body in them - so printing it
 * is a route by which a token, a barcode or a PIN echoed back by a failing
 * service ends up on screen. In dev the router devtools carry the real error;
 * in production the user gets an action, not a stack trace.
 */
export default function RouteError({ error }: Partial<ErrorComponentProps>) {
	const { t } = useTranslation();
	void error;

	return (
		<Box
			sx={{
				display: "flex",
				justifyContent: "center",
				alignItems: "center",
				// Same reasoning as NotFound: this renders inside the authenticated
				// Layout as well as bare.
				minHeight: "60vh",
				py: 4,
			}}>
			<Error
				title={t("ui.feedback.error.general")}
				message={t("ui.feedback.error.loading_message")}
				description={t("ui.feedback.error.reload_message")}
				action={t("ui.actions.reload")}
				reload
			/>
		</Box>
	);
}
