import { createFileRoute } from "@tanstack/react-router";
import { pageTitle } from "@helpers/pageTitle";
import Box from "@mui/material/Box";
import Error from "@components/Error/Error";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/networkError")({
	head: () => ({ meta: [{ title: pageTitle("ui.feedback.network_error") }] }),
	component: NetworkError,
});

function NetworkError() {
	const { t } = useTranslation();

	return (
		<Box
			component="main"
			sx={{
				display: "flex",
				justifyContent: "center",
				alignItems: "center",
				minHeight: "100vh",
			}}>
			<Error
				title={t("ui.feedback.network_error")}
				message={t("ui.feedback.network_error_message")}
				description={t("ui.actions.go_back_message")}
				action={t("ui.actions.go_back")}
			/>
		</Box>
	);
}
