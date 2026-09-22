
import { pageTitle } from "@helpers/pageTitle";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import Typography from "@mui/material/Typography";
export const Route = createFileRoute("/__authenticated/contacts")({
	head: () => ({ meta: [{ title: pageTitle("nav.contacts.title") }] }),
	component: RouteComponent,
});

function RouteComponent() {
	const { t } = useTranslation();
	return (
		<>
			<Typography variant="h1">{t("nav.contacts.title")}</Typography>
			<Typography variant="body1">{t("ui.info.coming_soon")}</Typography>
		</>
	);
}
