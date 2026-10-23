import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "react-oidc-context";
import { useNavigate, useRouter, useSearch } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Alert, Box, Button, Stack, Typography } from "@mui/material";

import { CustomLink } from "@components/CustomLink";
import InsightsSummary from "@components/Home/InsightsSummary";
import LibrarySplit from "@components/Home/LibrarySplit";
import NoticesPanel from "@components/Home/NoticesPanel";
import PickupHere from "@components/Home/PickupHere";
import SetupChecklist from "@components/Home/SetupChecklist";
import HomeSections from "@components/Home/HomeSections";
import WindowChoice from "@components/Home/WindowChoice";
import { useAgencyCodes } from "@/hooks/useAgencyCodes";
import {
	isInsightsPageShown,
	isHomeAnnouncementsEnabled,
	isHomeInsightsEnabled,
	isHomeLastWeekEnabled,
	isHomeLibrarySplitEnabled,
	isHomePickupHereEnabled,
	isHomeSetupChecklistEnabled,
	isHomeSinceLastVisitEnabled,
} from "@helpers/featureFlags";
import { formatDateTime } from "@helpers/formatters";
import {
	nextVisits,
	readVisits,
	sinceLastVisit,
	writeVisits,
} from "@helpers/lastVisit";
import {
	borrowedByLibraryQuery,
	hasBorrowingScope,
	suppliedByLibraryQuery,
} from "@helpers/patronRequestScope";
import { libraryQueryOptions } from "@helpers/sharedQueries";
import {
	comparesWithLastWeek,
	type HomeWindow,
	homeCountsQueryOptions,
	homeLastWeekQueryOptions,
} from "@helpers/home";

export default function HomePage() {
	const { t } = useTranslation();
	const { cfg } = useRouter().options.context as {
		cfg: { VITE_DCB_API_BASE: string };
	};
	const apiBase = cfg?.VITE_DCB_API_BASE;
	const { agencyCode: code, agencyCodes } = useAgencyCodes();
	const search = useSearch({ from: "/__authenticated/" });
	const navigate = useNavigate({ from: "/" });
	const auth = useAuth();

	const sinceLastVisitOn = isHomeSinceLastVisitEnabled();
	// Lazy: a re-render must not recompute the window after the effect below writes this visit
	const [visitSince] = useState(() =>
		sinceLastVisitOn
			? sinceLastVisit(nextVisits(readVisits(), new Date()), new Date())
			: null,
	);
	useEffect(() => {
		if (sinceLastVisitOn) writeVisits(nextVisits(readVisits(), new Date()));
	}, [sinceLastVisitOn]);

	const span: HomeWindow =
		search.window === "visit"
			? sinceLastVisitOn && visitSince
				? { kind: "visit", since: visitSince }
				: { kind: "today" }
			: { kind: search.window ?? "today" };

	// Without a code it would ask for "agencyCode:" and show whichever library came first
	const libraryQuery = useQuery({
		...libraryQueryOptions(apiBase, code ?? ""),
		enabled: !!apiBase && !!code,
	});
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
		...homeCountsQueryOptions(apiBase, scopes, span),
		enabled: !!apiBase && scoped,
	});
	const counts = countsQuery.data;

	const compareLastWeek =
		isHomeLastWeekEnabled() && comparesWithLastWeek(span.kind);
	const lastWeekQuery = useQuery({
		...homeLastWeekQueryOptions(apiBase, scopes, {
			since: counts?.since ?? "",
			until: counts?.until ?? "",
		}),
		enabled: compareLastWeek && !!counts,
	});

	const unscopable = !scoped && libraryQuery.isSuccess;
	const failed = libraryQuery.isError || countsQuery.isError;
	const busy = libraryQuery.isFetching || countsQuery.isFetching;

	// Try again replaces the alert holding focus with the counts; focus follows to what replaced it
	const statusRef = useRef<HTMLParagraphElement>(null);
	const retried = useRef(false);
	useEffect(() => {
		if (retried.current && counts) {
			retried.current = false;
			statusRef.current?.focus();
		}
	}, [counts]);

	const retry = () => {
		if (busy) return;
		retried.current = true;
		if (libraryQuery.isError) libraryQuery.refetch();
		if (countsQuery.isError) countsQuery.refetch();
	};
	// Not `disabled`: a button that disables itself while focused drops focus to the page
	const refresh = () => {
		if (!counts || busy) return;
		countsQuery.refetch();
	};
	const isLibraryAdmin = (auth.user?.profile?.roles ?? []).includes(
		"LIBRARY_ADMIN",
	);

	return (
		<Stack spacing={3}>
			<Box>
				<Typography variant="h1" gutterBottom>
					{/* Not "Welcome to DCB Admin for " while the library loads, or if it fails */}
					{library?.fullName
						? t("home.title", { library: library.fullName })
						: t("nav.home.title")}
				</Typography>

				<Typography sx={{ maxWidth: "75ch" }}>
					{t("home.welcome")}
				</Typography>
			</Box>

			{library?.fullName ? (
				<Typography variant="subtitle1" component="p">
					{t("home.summary_for", { library: library.fullName })}
				</Typography>
			) : null}

			{unscopable ? (
				<Alert severity="warning">{t("home.no_scope")}</Alert>
			) : failed ? (
				<Alert
					severity="error"
					action={
						<Button
							color="inherit"
							size="small"
							onClick={retry}
							aria-disabled={busy}>
							{t("home.retry")}
						</Button>
					}>
					{t("home.load_failed")}
				</Alert>
			) : (
				<>
					<Stack
						direction={{ xs: "column", md: "row" }}
						spacing={2}
						useFlexGap
						sx={{ alignItems: { md: "center" }, flexWrap: "wrap" }}>
						<WindowChoice
							value={span.kind}
							offerVisit={sinceLastVisitOn}
							visitKnown={!!visitSince}
							onChange={(next) =>
								navigate({
									search: { window: next === "today" ? undefined : next },
									replace: true,
								})
							}
						/>
						<Typography
							ref={statusRef}
							tabIndex={-1}
							role="status"
							variant="body2"
							color="text.secondary">
							{counts && !countsQuery.isFetching
								? t("home.counted", {
										since: formatDateTime(counts.since),
										until: formatDateTime(counts.until),
									})
								: t("home.counting")}
						</Typography>
						<Button
							variant="outlined"
							size="small"
							onClick={refresh}
							aria-disabled={!counts || busy}
							sx={{ alignSelf: { xs: "flex-start", md: "auto" } }}>
							{t("home.refresh")}
						</Button>
					</Stack>

					<HomeSections
						data={counts}
						lastWeek={compareLastWeek ? (lastWeekQuery.data ?? {}) : undefined}
						windowKind={span.kind}
					/>

					{isHomePickupHereEnabled() && code && scoped ? (
						<PickupHere
							apiBase={apiBase}
							agencyCode={code}
							borrowedScope={scopes.borrowed}
						/>
					) : null}

					{isHomeLibrarySplitEnabled() &&
					agencyCodes.length > 1 &&
					counts ? (
						<LibrarySplit
							apiBase={apiBase}
							agencyCodes={agencyCodes}
							span={span}
						/>
					) : null}
				</>
			)}

			{isHomeSetupChecklistEnabled() && library && scoped ? (
				<SetupChecklist apiBase={apiBase} scopes={scopes} library={library} />
			) : null}

			{isHomeAnnouncementsEnabled() && library?.id ? (
				<NoticesPanel apiBase={apiBase} libraryId={library.id} />
			) : null}

			{/* Insights is for library administrators, as its own route requires */}
			{!isLibraryAdmin ? null : isHomeInsightsEnabled() && hostLmsCode ? (
				<InsightsSummary libraryCode={hostLmsCode} />
			) : isInsightsPageShown("insights") ? (
				<Typography>
					<CustomLink to="/insights">{t("home.insights_link")}</CustomLink>
				</Typography>
			) : null}
		</Stack>
	);
}
