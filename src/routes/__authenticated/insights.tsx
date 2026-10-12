import { pageTitle } from "@helpers/pageTitle";
import { createFileRoute, redirect } from "@tanstack/react-router";

import LibraryInsights from "@components/Insights/LibraryInsights";
import InsightsPending from "@components/Insights/InsightsPending";

import { isInsightsEnabled } from "@helpers/featureFlags";
import { createRestClient } from "@helpers/createRestClient";
import { ownLibraryQueryOptions, hostLmsCodeOf } from "@helpers/ownLibrary";
import { statsWindow } from "@helpers/insightsRange";

import { insightsSearchSchema, resolveSearch } from "@helpers/insightsSearch";
import { currentAgencyCode } from "@/hooks/useAgencyCodes";
import {
	dashboardQueryOptions,
	timeSeriesQueryOptions,
	StatsParams,
} from "@helpers/statsApi";

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
	loaderDeps: ({ search }) => ({
		range: search.range,
		from: search.from,
		to: search.to,
	}),

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

	loader: async ({ context, deps }) => {
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

		// The same library the component resolves, from the token's claim and the
		// header's selection - never from the URL - or the prefetch is for a key the
		// page never reads.
		const agencyCode = currentAgencyCode(auth.user?.profile?.code);
		if (!agencyCode) return;

		const libraryData = await queryClient.ensureQueryData(
			ownLibraryQueryOptions(cfg, agencyCode),
		);

		const libraryCode = hostLmsCodeOf(libraryData);
		if (!libraryCode) return;

		const client = createRestClient(cfg?.VITE_DCB_API_BASE);
		const view = resolveSearch(deps);
		const { window, interval } = statsWindow(view.range, view.custom);
		const params: StatsParams = { libraryCode, ...window };

		// Above-the-fold only: the combined KPI call plus the trend spine. Everything
		// below is a LazyPanel that fetches when it scrolls into view, so navigation
		// is not blocked on data the user has not asked for.
		return Promise.all([
			queryClient.ensureQueryData(dashboardQueryOptions(client, params)),
			queryClient.ensureQueryData(
				timeSeriesQueryOptions(client, params, interval),
			),
		]);
	},

	pendingComponent: InsightsPending,
	head: () => ({ meta: [{ title: pageTitle("nav.insights.title") }] }),
	component: LibraryInsights,
});
