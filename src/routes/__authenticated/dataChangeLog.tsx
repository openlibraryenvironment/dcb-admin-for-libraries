import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import Typography from "@mui/material/Typography";

export const Route = createFileRoute("/__authenticated/dataChangeLog")({
	component: RouteComponent,
});

function RouteComponent() {
	const { t } = useTranslation();
	return <Typography variant="body1">{t("ui.info.coming_soon")}</Typography>;
}
