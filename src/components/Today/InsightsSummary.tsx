import { lazy, Suspense, useId, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Box, Skeleton, Typography } from "@mui/material";

import { CustomLink } from "@components/CustomLink";
import { rangeToParams } from "@helpers/insightsRange";
import type { StatsParams } from "@helpers/statsApi";

// Lazy: the tiles and the statistics client load only where this part is on
const OverviewTiles = lazy(() => import("@components/Insights/OverviewTiles"));

// KpiTile's own fixed height, so the tiles replace the placeholder without moving the page
const TILE_HEIGHT = 132;

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
				fallback={
					<Box
						sx={{
							display: "grid",
							gap: 2,
							gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
						}}
					>
						{Array.from({ length: 5 }, (_, i) => (
							<Skeleton key={i} variant="rounded" height={TILE_HEIGHT} />
						))}
					</Box>
				}
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
