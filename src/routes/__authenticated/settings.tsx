import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import MuiLink from "@mui/material/Link";

import { DisplaySettings } from "@components/App/DisplaySettings";
import { pageTitle } from "@helpers/pageTitle";

export const Route = createFileRoute("/__authenticated/settings")({
	head: () => ({ meta: [{ title: pageTitle("nav.settings.title") }] }),
	component: RouteComponent,
});

function RouteComponent() {
	const { t } = useTranslation();

	return (
		<Grid
			container
			spacing={{ xs: 2, md: 3 }}
			columns={{ xs: 4, sm: 8, md: 12 }}>
			<Grid size={{ xs: 4, sm: 8, md: 12 }}>
				<Typography variant="h1">{t("nav.settings.title")}</Typography>
			</Grid>
			<Grid size={{ xs: 4, sm: 8, md: 12 }}>
				<Typography variant="h3" component="h2">
					{t("display.heading")}
				</Typography>
			</Grid>
			<Grid size={{ xs: 4, sm: 8, md: 12 }}>
				<DisplaySettings />
			</Grid>
			<Grid size={{ xs: 4, sm: 8, md: 12 }}>
				{/* Beside the settings it describes, which is where somebody looking
				    for it will be. */}
				<MuiLink component={Link} to="/accessibility">
					{t("legal.accessibility.title")}
				</MuiLink>
			</Grid>
		</Grid>
	);
}
