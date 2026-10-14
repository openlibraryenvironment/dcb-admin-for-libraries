import { useId } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Alert, Box, Paper, Typography } from "@mui/material";

import {
	agencyLocationIdsQueryOptions,
	homePickupHereQueryOptions,
} from "@helpers/home";
import { TILE_MIN_HEIGHT } from "./layout";
import { Figure, TileList, TileSkeleton } from "./HomeSections";

/**
 * Other libraries' patrons collecting at this library. No grid lists these, so they are
 * counted and not linked. 8.71.0 only: isHomePickupHereEnabled says why.
 */
export default function PickupHere({
	apiBase,
	agencyCode,
	borrowedScope,
}: {
	apiBase: string;
	agencyCode: string;
	borrowedScope: string;
}) {
	const { t } = useTranslation();
	const headingId = useId();

	const locations = useQuery(agencyLocationIdsQueryOptions(apiBase, agencyCode));
	const locationIds = locations.data ?? [];
	const counts = useQuery({
		...homePickupHereQueryOptions(apiBase, locationIds, borrowedScope),
		enabled: locationIds.length > 0,
	});

	const failed = locations.isError || counts.isError;
	const noLocations = locations.isSuccess && locationIds.length === 0;

	return (
		<Box component="section" aria-labelledby={headingId}>
			<Typography variant="h2" id={headingId} gutterBottom>
				{t("home.pickup.title")}
			</Typography>
			<Typography gutterBottom>{t("home.pickup.description")}</Typography>
			{failed ? (
				<Alert severity="error">{t("home.pickup.load_failed")}</Alert>
			) : noLocations ? (
				<Typography color="text.secondary">{t("home.pickup.no_locations")}</Typography>
			) : (
				<TileList>
					{(["ready", "arriving"] as const).map((id) => (
						<Box component="li" key={id}>
							<Paper variant="outlined" sx={{ p: 2, minHeight: TILE_MIN_HEIGHT, height: "100%" }}>
								{counts.data ? (
									<>
										<Figure value={counts.data[id]} />
										<Typography component="span">
											{counts.data[id] === null
												? t("home.unknown", {
														label: t(`home.pickup.counts.${id}`, { count: 2 }),
													})
												: t(`home.pickup.counts.${id}`, { count: counts.data[id] })}
										</Typography>
									</>
								) : (
									<TileSkeleton />
								)}
							</Paper>
						</Box>
					))}
				</TileList>
			)}
		</Box>
	);
}
