import { useId } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Alert, Box, Paper, Typography } from "@mui/material";

import { CustomLink } from "@components/CustomLink";
import { isPickupRequestsEnabled } from "@helpers/featureFlags";
import {
	agencyLocationIdsQueryOptions,
	homePickupHereQueryOptions,
} from "@helpers/home";
import { linkFilters } from "@helpers/viewState/linkFilters";
import { TILE_MIN_HEIGHT } from "./layout";
import { Figure, TileList, TileSkeleton } from "./HomeSections";

const STATUS_OF = { ready: "READY_FOR_PICKUP", arriving: "PICKUP_TRANSIT" } as const;

/**
 * Other libraries' patrons collecting at this library. Linked to Collecting here where it is
 * offered (9.2.0); on 8.71.0 no list holds them, so they are counted only. isHomePickupHereEnabled.
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
	const listed = isPickupRequestsEnabled();
	const noLocations = locations.isSuccess && locationIds.length === 0;

	return (
		<Box component="section" aria-labelledby={headingId}>
			<Typography variant="h2" id={headingId} gutterBottom>
				{t("home.pickup.title")}
			</Typography>
			<Typography gutterBottom>
				{t(listed ? "home.pickup.description_listed" : "home.pickup.description")}
			</Typography>
			{failed ? (
				<Alert severity="error">{t("home.pickup.load_failed")}</Alert>
			) : noLocations ? (
				<Typography color="text.secondary">{t("home.pickup.no_locations")}</Typography>
			) : (
				<TileList>
					{(["ready", "arriving"] as const).map((id) => (
						<Box component="li" key={id}>
							<Paper variant="outlined" sx={{ p: 2, minHeight: TILE_MIN_HEIGHT, height: "100%" }}>
								{counts.data && listed && counts.data[id] ? (
									// Not colour alone: a 0 or an unknown is the same tile without a link
									<CustomLink
										to="/pickupRequests"
										search={{
											filters: linkFilters([
												{ id: 1, field: "status", operator: "is", value: STATUS_OF[id] },
											]),
										}}
										underline="always"
										sx={{ display: "block" }}>
										<Figure value={counts.data[id]} />
										<Typography component="span">
											{t(`home.pickup.counts.${id}`, { count: counts.data[id] })}
										</Typography>
									</CustomLink>
								) : counts.data ? (
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
