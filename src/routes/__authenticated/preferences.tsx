import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";

import MuiLink from "@mui/material/Link";

import { AboutSettings } from "@components/App/AboutSettings";
import { DisplaySettings } from "@components/App/DisplaySettings";
import { pageTitle } from "@helpers/pageTitle";

// Its table and its /info read are below the fold: not part of what the page needs first
const FeatureAvailability = lazy(() =>
	import("@components/App/FeatureAvailability").then((module) => ({
		default: module.FeatureAvailability,
	})),
);

export const Route = createFileRoute("/__authenticated/preferences")({
	head: () => ({ meta: [{ title: pageTitle("nav.preferences.title") }] }),
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
				<Typography variant="h1">{t("nav.preferences.title")}</Typography>
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
				{/* Beside the preferences it describes, which is where somebody looking
				    for it will be. */}
				<MuiLink component={Link} to="/accessibility">
					{t("legal.accessibility.title")}
				</MuiLink>
			</Grid>
			<Grid size={{ xs: 4, sm: 8, md: 12 }}>
				<Typography variant="h3" component="h2">
					{t("about.heading")}
				</Typography>
			</Grid>
			<Grid size={{ xs: 4, sm: 8, md: 12 }}>
				<AboutSettings />
			</Grid>
			<Grid size={{ xs: 4, sm: 8, md: 12 }}>
				<Suspense fallback={null}>
					<FeatureAvailability />
				</Suspense>
			</Grid>
		</Grid>
	);
}
