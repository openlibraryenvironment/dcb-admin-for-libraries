import { useId, useMemo } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
	Alert,
	Box,
	Button,
	Paper,
	Skeleton,
	Stack,
	Typography,
} from "@mui/material";

import { CustomLink } from "@components/CustomLink";
import { useAgencyCodes } from "@/hooks/useAgencyCodes";
import { isInsightsEnabled } from "@helpers/featureFlags";
import { formatDateTime, formatNumber } from "@helpers/formatters";
import { pageTitle } from "@helpers/pageTitle";
import {
	borrowedByLibraryQuery,
	hasBorrowingScope,
	suppliedByLibraryQuery,
} from "@helpers/patronRequestScope";
import { libraryQueryOptions } from "@helpers/sharedQueries";
import {
	TODAY_COUNTS,
	TODAY_WINDOW_HOURS,
	todayCountsQueryOptions,
	type TodayCount,
	type TodayCounts,
	type TodaySection,
} from "@helpers/today";

export const Route = createFileRoute("/__authenticated/")({
	head: () => ({ meta: [{ title: pageTitle("nav.today.title") }] }),
	component: TodayComponent,
});

const SECTIONS: readonly TodaySection[] = ["waiting", "problems", "activity"];

const GRID_FOR = {
	borrowed: "/patronRequests",
	supplied: "/supplierRequests",
} as const;

/** The tile's height in every state, so loading, a number and an error all take the same space. */
const TILE_MIN_HEIGHT = 96;

function TodayComponent() {
	const { t } = useTranslation();
	const { cfg } = useRouter().options.context as {
		cfg: { VITE_DCB_API_BASE: string };
	};
	const apiBase = cfg?.VITE_DCB_API_BASE;
	const { agencyCode: code } = useAgencyCodes();

	const libraryQuery = useQuery(libraryQueryOptions(apiBase, code ?? ""));
	const library = libraryQuery.data?.libraries?.content?.[0];
	const hostLmsCode = library?.agency?.hostLms?.code;

	const scopes = useMemo(
		() => ({
			borrowed: borrowedByLibraryQuery(code, hostLmsCode),
			supplied: suppliedByLibraryQuery(code),
		}),
		[code, hostLmsCode],
	);
	const scoped = !!code && hasBorrowingScope(code, hostLmsCode);

	const countsQuery = useQuery({
		...todayCountsQueryOptions(apiBase, scopes),
		enabled: !!apiBase && scoped,
	});

	const unscopable = !scoped && libraryQuery.isSuccess;

	return (
		<Stack spacing={3}>
			<Box>
				<Typography variant="h1">{t("today.title")}</Typography>
				{library?.fullName ? (
					<Typography variant="subtitle1" component="p">
						{t("today.subtitle", { library: library.fullName })}
					</Typography>
				) : null}
			</Box>

			{unscopable ? (
				<Alert severity="warning">{t("today.no_scope")}</Alert>
			) : countsQuery.isError ? (
				<Alert
					severity="error"
					action={
						<Button
							color="inherit"
							size="small"
							onClick={() => countsQuery.refetch()}
							disabled={countsQuery.isFetching}
						>
							{t("today.retry")}
						</Button>
					}
				>
					{t("today.load_failed")}
				</Alert>
			) : (
				<>
					<Stack
						direction={{ xs: "column", sm: "row" }}
						spacing={2}
						sx={{ alignItems: { sm: "center" } }}
					>
						<Typography role="status" variant="body2" color="text.secondary">
							{countsQuery.data
								? t("today.counted", {
										since: formatDateTime(countsQuery.data.since),
										hours: TODAY_WINDOW_HOURS,
									})
								: t("today.counting")}
						</Typography>
						<Button
							variant="outlined"
							size="small"
							onClick={() => countsQuery.refetch()}
							disabled={!countsQuery.data || countsQuery.isFetching}
							sx={{ alignSelf: { xs: "flex-start", sm: "auto" } }}
						>
							{t("today.refresh")}
						</Button>
					</Stack>

					{SECTIONS.map((section) => (
						<TodaySectionList
							key={section}
							section={section}
							data={countsQuery.data}
						/>
					))}
				</>
			)}

			{isInsightsEnabled() ? (
				<Typography>
					<CustomLink to="/insights">{t("today.insights_link")}</CustomLink>
				</Typography>
			) : null}
		</Stack>
	);
}

function TodaySectionList({
	section,
	data,
}: {
	section: TodaySection;
	data: TodayCounts | undefined;
}) {
	const { t } = useTranslation();
	const headingId = useId();
	const counts = TODAY_COUNTS.filter((count) => count.section === section);

	return (
		<Box component="section" aria-labelledby={headingId}>
			<Typography variant="h2" id={headingId} gutterBottom>
				{t(`today.sections.${section}`, { hours: TODAY_WINDOW_HOURS })}
			</Typography>
			<Box
				component="ul"
				sx={{
					listStyle: "none",
					p: 0,
					m: 0,
					display: "grid",
					gap: 2,
					gridTemplateColumns: {
						xs: "1fr",
						sm: "repeat(2, 1fr)",
						md: "repeat(4, 1fr)",
					},
				}}
			>
				{counts.map((count) => (
					<Box component="li" key={count.id}>
						<Paper variant="outlined" sx={{ p: 2, minHeight: TILE_MIN_HEIGHT }}>
							<TodayTile count={count} data={data} />
						</Paper>
					</Box>
				))}
			</Box>
		</Box>
	);
}

function TodayTile({
	count,
	data,
}: {
	count: TodayCount;
	data: TodayCounts | undefined;
}) {
	const { t } = useTranslation();

	if (!data) {
		return (
			<>
				<Skeleton variant="text" width="30%" height={40} />
				<Skeleton variant="text" width="80%" />
			</>
		);
	}

	const value = data.counts[count.id];
	const label = t(`today.counts.${count.id}`, { count: value ?? 0 });

	const figure = (
		<Typography variant="h4" component="span" sx={{ display: "block" }}>
			{value === null ? "—" : formatNumber(value)}
		</Typography>
	);

	// A number with nothing behind it opens an empty grid; an unknown is said in words
	if (value === null) {
		return (
			<>
				{figure}
				<Typography component="span">
					{t("today.unknown", { label: t(`today.counts.${count.id}`, { count: 2 }) })}
				</Typography>
			</>
		);
	}
	if (value === 0) {
		return (
			<>
				{figure}
				<Typography component="span">{label}</Typography>
			</>
		);
	}
	return (
		<CustomLink
			to={GRID_FOR[count.scope]}
			search={{ filters: count.filters(data.since) }}
			underline="hover"
			sx={{ display: "block" }}
		>
			{figure}
			<Typography component="span">{label}</Typography>
		</CustomLink>
	);
}
