import { useEffect, useMemo, useState } from "react";
import { useNavigate, useRouter, useSearch } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Alert, Box, Button, Stack, Typography } from "@mui/material";

import { CustomLink } from "@components/CustomLink";
import InsightsSummary from "@components/Today/InsightsSummary";
import LibrarySplit from "@components/Today/LibrarySplit";
import NoticesPanel from "@components/Today/NoticesPanel";
import PickupHere from "@components/Today/PickupHere";
import SetupChecklist from "@components/Today/SetupChecklist";
import TodaySections from "@components/Today/TodaySections";
import WindowChoice from "@components/Today/WindowChoice";
import { useAgencyCodes } from "@/hooks/useAgencyCodes";
import {
	isInsightsEnabled,
	isTodayAnnouncementsEnabled,
	isTodayInsightsEnabled,
	isTodayLastWeekEnabled,
	isTodayLibrarySplitEnabled,
	isTodayPickupHereEnabled,
	isTodaySetupChecklistEnabled,
	isTodaySinceLastVisitEnabled,
} from "@helpers/featureFlags";
import { formatDateTime } from "@helpers/formatters";
import { nextVisits, readVisits, sinceLastVisit, writeVisits } from "@helpers/lastVisit";
import {
	borrowedByLibraryQuery,
	hasBorrowingScope,
	suppliedByLibraryQuery,
} from "@helpers/patronRequestScope";
import { libraryQueryOptions } from "@helpers/sharedQueries";
import {
	TODAY_WINDOW_HOURS,
	type TodayWindowKind,
	todayCountsQueryOptions,
	todayLastWeekQueryOptions,
} from "@helpers/today";


export default function TodayPage() {
	const { t } = useTranslation();
	const { cfg } = useRouter().options.context as {
		cfg: { VITE_DCB_API_BASE: string };
	};
	const apiBase = cfg?.VITE_DCB_API_BASE;
	const { agencyCode: code, agencyCodes } = useAgencyCodes();
	const search = useSearch({ from: "/__authenticated/" });
	const navigate = useNavigate({ from: "/" });

	const sinceLastVisitOn = isTodaySinceLastVisitEnabled();
	// Read once per page view: reopening the page within a visit must not move the window
	const [visitSince] = useState(() =>
		sinceLastVisitOn ? sinceLastVisit(nextVisits(readVisits(), new Date()), new Date()) : null,
	);
	useEffect(() => {
		if (sinceLastVisitOn) writeVisits(nextVisits(readVisits(), new Date()));
	}, [sinceLastVisitOn]);

	const windowKind: TodayWindowKind =
		sinceLastVisitOn && search.window === "visit" && visitSince ? "visit" : "day";

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
		...todayCountsQueryOptions(apiBase, scopes, windowKind === "visit" ? visitSince : null),
		enabled: !!apiBase && scoped,
	});
	const counts = countsQuery.data;

	const lastWeekQuery = useQuery({
		...todayLastWeekQueryOptions(apiBase, scopes, {
			since: counts?.since ?? "",
			until: counts?.until ?? "",
		}),
		enabled: isTodayLastWeekEnabled() && !!counts,
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

			{isTodaySetupChecklistEnabled() && library && scoped ? (
				<SetupChecklist apiBase={apiBase} scopes={scopes} library={library} />
			) : null}

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
						direction={{ xs: "column", md: "row" }}
						spacing={2}
						sx={{ alignItems: { md: "center" } }}
					>
						{sinceLastVisitOn ? (
							<WindowChoice
								value={windowKind}
								visitKnown={!!visitSince}
								onChange={(next) =>
									navigate({ search: { window: next }, replace: true })
								}
							/>
						) : null}
						<Typography role="status" variant="body2" color="text.secondary">
							{counts
								? windowKind === "visit"
									? t("today.counted_visit", { since: formatDateTime(counts.since) })
									: t("today.counted", {
											since: formatDateTime(counts.since),
											hours: TODAY_WINDOW_HOURS,
										})
								: t("today.counting")}
						</Typography>
						<Button
							variant="outlined"
							size="small"
							onClick={() => countsQuery.refetch()}
							disabled={!counts || countsQuery.isFetching}
							sx={{ alignSelf: { xs: "flex-start", md: "auto" } }}
						>
							{t("today.refresh")}
						</Button>
					</Stack>

					<TodaySections
						data={counts}
						lastWeek={isTodayLastWeekEnabled() ? lastWeekQuery.data : undefined}
						windowKind={windowKind}
					/>

					{isTodayPickupHereEnabled() && code && scoped ? (
						<PickupHere
							apiBase={apiBase}
							agencyCode={code}
							borrowedScope={scopes.borrowed}
						/>
					) : null}

					{isTodayLibrarySplitEnabled() && agencyCodes.length > 1 && counts ? (
						<LibrarySplit
							apiBase={apiBase}
							agencyCodes={agencyCodes}
							since={counts.since}
						/>
					) : null}
				</>
			)}

			{isTodayAnnouncementsEnabled() && library?.id ? (
				<NoticesPanel apiBase={apiBase} libraryId={library.id} />
			) : null}

			{isTodayInsightsEnabled() && hostLmsCode ? (
				<InsightsSummary libraryCode={hostLmsCode} />
			) : isInsightsEnabled() ? (
				<Typography>
					<CustomLink to="/insights">{t("today.insights_link")}</CustomLink>
				</Typography>
			) : null}
		</Stack>
	);
}
