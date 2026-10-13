import { lazy, Suspense, useId, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Box, Skeleton, Typography } from "@mui/material";

import { CustomLink } from "@components/CustomLink";
import { rangeToParams } from "@helpers/insightsRange";
import type { StatsParams } from "@helpers/statsApi";

// Lazy so Today, the page every sign-in lands on, carries no chart code where this is off
const OverviewTiles = lazy(() => import("@components/Insights/OverviewTiles"));

const TILE_HEIGHT = 120;

/** The Insights overview tiles for the last seven days, as the Insights page shows them. */
export default function InsightsSummary({ libraryCode }: { libraryCode: string }) {
	const { t } = useTranslation();
	const headingId = useId();
	const params = useMemo<StatsParams>(
		() => ({ libraryCode, ...rangeToParams("7d") }),
		[libraryCode],
	);

	return (
		<Box component="section" aria-labelledby={headingId}>
			<Typography variant="h2" id={headingId} gutterBottom>
				{t("today.insights.title")}
			</Typography>
			<Suspense
				fallback={<Skeleton variant="rectangular" height={TILE_HEIGHT} />}
			>
				<OverviewTiles params={params} />
			</Suspense>
			<Typography sx={{ mt: 1 }}>
				<CustomLink to="/insights" search={{ range: "7d" }}>
					{t("today.insights.more")}
				</CustomLink>
			</Typography>
		</Box>
	);
}
