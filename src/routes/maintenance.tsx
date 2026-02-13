import { createFileRoute } from "@tanstack/react-router";
import Box from "@mui/material/Box";
import Error from "@components/Error/Error";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/maintenance")({
	component: MaintenancePage,
});

function MaintenancePage() {
	const { t } = useTranslation();

	return (
		<Box
			sx={{
				display: "flex",
				justifyContent: "center",
				alignItems: "center",
				minHeight: "100vh",
			}}>
			<Error
				title={t("ui.feedback.maintenance")}
				message={t("ui.feedback.maintenance_message")}
				description={t("ui.actions.go_back_message")}
				action={t("ui.actions.go_back")}
			/>
		</Box>
	);
}
