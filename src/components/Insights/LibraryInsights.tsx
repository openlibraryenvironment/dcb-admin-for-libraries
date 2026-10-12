import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { getRouteApi, useRouter } from "@tanstack/react-router";
import { useAuth } from "react-oidc-context";
import { Alert, Stack, Typography } from "@mui/material";

import Loading from "@components/Loading/Loading";
import Error from "@components/Error/Error";
import InsightsDashboard from "@components/Insights/InsightsDashboard";
import {
	ownLibraryQueryOptions,
	hostLmsCodeOf,
	libraryOf,
} from "@helpers/ownLibrary";
import { useInsightsView } from "@/hooks/useInsightsView";
import { useAgencyCodes } from "@/hooks/useAgencyCodes";

const route = getRouteApi("/__authenticated/insights");

export default function LibraryInsights() {
	const view = useInsightsView(route.useSearch(), "/insights");
	const { t } = useTranslation();
	const auth = useAuth();
	const { cfg } = useRouter().options.context as { cfg: any };

	// The library selected in the header, from the token's own claim: the claim can
	// name several libraries, and read raw it is all of them run together.
	const { agencyCode } = useAgencyCodes();

	// The third guard. Since App.tsx invalidates the router once the session
	// settles, the route guards are decisive and a read-only user no longer
	// reaches this component at all - but the queries below are the expensive,
	// scope-sensitive ones, so they keep their own condition.
	const allowed = (auth.user?.profile?.roles ?? []).includes("LIBRARY_ADMIN");

	const { data, isLoading, error } = useQuery({
		...ownLibraryQueryOptions(cfg, agencyCode ?? ""),
		enabled: allowed && !!agencyCode,
	});

	const library = useMemo(() => libraryOf(data), [data]);
	const libraryCode = useMemo(() => hostLmsCodeOf(data), [data]);

	// Render nothing rather than an error: the user is mid-redirect, and a flash of
	// "access denied" on the way to /requesting is noise, not information.
	if (!allowed) return null;

	if (isLoading) {
		return (
			<Loading title={t("insights.loading")} subtitle={t("ui.info.wait")} />
		);
	}

	if (error || !library) {
		return (
			<Error
				title={t("ui.feedback.error.cannot_retrieve_record")}
				message={t("ui.info.connection_issue")}
				action={t("ui.actions.go_back")}
				goBack="/"
			/>
		);
	}

	// A library with no Host LMS on its agency has nothing to filter the statistics
	// by. Say so plainly rather than rendering a page of empty charts that reads as
	// "your library did nothing".
	if (!libraryCode) {
		return (
			<Stack spacing={2}>
				<Typography variant="h1">{t("insights.title")}</Typography>
				<Alert severity="info">{t("insights.no_host_lms")}</Alert>
			</Stack>
		);
	}

	return (
		<Stack spacing={3}>
			<Stack spacing={0.5}>
				<Typography variant="h1">{t("insights.title")}</Typography>
				<Typography variant="body2" color="text.secondary">
					{t("insights.subtitle", { library: library.fullName })}
				</Typography>
			</Stack>
			<InsightsDashboard libraryCode={libraryCode} view={view} />
		</Stack>
	);
}
