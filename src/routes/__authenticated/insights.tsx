import { pageTitle } from "@helpers/pageTitle";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useAuth } from "react-oidc-context";
import { Alert, Stack, Typography } from "@mui/material";

import Loading from "@components/Loading/Loading";
import Error from "@components/Error/Error";
import InsightsDashboard from "@components/Insights/InsightsDashboard";

import { isInsightsEnabled } from "@helpers/featureFlags";
import { createRestClient } from "@helpers/createRestClient";
import {
  ownLibraryQueryOptions,
  hostLmsCodeOf,
  libraryOf,
} from "@helpers/ownLibrary";
import { rangeToParams, intervalForRange } from "@helpers/insightsRange";

import { insightsSearchSchema } from "@helpers/insightsSearch";
import { useInsightsView } from "@/hooks/useInsightsView";
import {
  dashboardQueryOptions,
  timeSeriesQueryOptions,
  StatsParams,
} from "@helpers/statsApi";

// Must mirror insightsPlotStore's default preset, or the loader prefetches under a
// key the component never reads and every panel refetches on mount.
const DEFAULT_PRESET = "30d" as const;

// Read-only users are confined to requesting (see __authenticated.tsx).
//
// Checked in beforeLoad AND at the top of the loader. beforeLoad now re-runs once
// the OIDC session settles - App.tsx invalidates the router - so it is decisive
// rather than advisory, and the loader check is a second line rather than the
// only one. It stays because this is the path that calls statistics endpoints.
function mayViewInsights(auth: {
  isAuthenticated?: boolean;
  user?: { profile?: { roles?: string[] } } | null;
}): boolean {
  if (!auth?.isAuthenticated) return true; // undecidable yet - let the next pass judge
  return (auth.user?.profile?.roles ?? []).includes("LIBRARY_ADMIN");
}

export const Route = createFileRoute("/__authenticated/insights")({
  // The library is fixed by the token, but the window, the plotted series and the cost
  // assumption are the reader's - and a link that carries them is the difference between
  // sending a colleague a figure and sending them a dashboard.
  validateSearch: insightsSearchSchema,
  // The tab is hidden while the flag is off, but the URL is still typeable - and
  // the page would call statistics endpoints this environment's dcb-service does
  // not serve yet. Guarded here rather than in a useEffect so the protected page
  // never renders first.
  beforeLoad: ({ context }) => {
    if (!isInsightsEnabled()) {
      throw redirect({ to: "/" });
    }

    if (!mayViewInsights((context as { auth?: any })?.auth ?? {})) {
      throw redirect({ to: "/requesting" });
    }
  },

  loader: async ({ context }) => {
    const { queryClient, cfg, auth } = context as {
      queryClient: any;
      cfg: any;
      auth: any;
    };
    if (!auth?.isAuthenticated) return;

    // Before anything is fetched: see mayViewInsights above.
    if (!mayViewInsights(auth)) {
      throw redirect({ to: "/requesting" });
    }

    // The agency code comes from the access token, never from the URL - this app
    // has no library picker and must not grow one.
    // `code` is a custom Keycloak claim, so oidc-client-ts types it as unknown.
    const agencyCode = auth.user?.profile?.code as string | undefined;
    if (!agencyCode) return;

    const libraryData = await queryClient.ensureQueryData(
      ownLibraryQueryOptions(cfg, auth, agencyCode),
    );

    const libraryCode = hostLmsCodeOf(libraryData);
    if (!libraryCode) return;

    const client = createRestClient(cfg, auth);
    const params: StatsParams = {
      libraryCode,
      ...rangeToParams(DEFAULT_PRESET),
    };

    // Above-the-fold only: the combined KPI call plus the trend spine. Everything
    // below is a LazyPanel that fetches when it scrolls into view, so navigation
    // is not blocked on data the user has not asked for.
    return Promise.all([
      queryClient.ensureQueryData(dashboardQueryOptions(client, params)),
      queryClient.ensureQueryData(
        timeSeriesQueryOptions(
          client,
          params,
          intervalForRange(DEFAULT_PRESET),
        ),
      ),
    ]);
  },

  pendingComponent: InsightsPending,
  head: () => ({ meta: [{ title: pageTitle("nav.insights.title") }] }),
  component: LibraryInsights,
});

function InsightsPending() {
  const { t } = useTranslation();
  return <Loading title={t("insights.loading")} subtitle={t("ui.info.wait")} />;
}

function LibraryInsights() {
  const view = useInsightsView(Route.useSearch(), "/insights");
  const { t } = useTranslation();
  const auth = useAuth();
  const { cfg } = useRouter().options.context as { cfg: any };

  // `code` is a custom Keycloak claim, so oidc-client-ts types it as unknown.
  const agencyCode = auth.user?.profile?.code as string | undefined;

  // The third guard. Since App.tsx invalidates the router once the session
  // settles, the route guards are decisive and a read-only user no longer
  // reaches this component at all - but the queries below are the expensive,
  // scope-sensitive ones, so they keep their own condition.
  const allowed = (auth.user?.profile?.roles ?? []).includes("LIBRARY_ADMIN");

  const { data, isLoading, error } = useQuery({
    ...ownLibraryQueryOptions(cfg, auth, agencyCode ?? ""),
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
