import { validateGridSearch } from "@helpers/viewState/gridSearch";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { pageTitle } from "@helpers/pageTitle";
import ClusterHistory from "@components/ClusterRecord/ClusterHistory";
import { recordHistoryView } from "@helpers/viewState/gridViewIds";

export const Route = createFileRoute(
	"/__authenticated/requesting/$recordId/history/",
)({
	validateSearch: validateGridSearch,
	beforeLoad: async ({ search, location, params }) => {
		// Loaded here, not with the route: the first load of every page would carry the codec
		const { privateFilterRedirect } = await import("@helpers/viewState/viewRoute");
		const removed = privateFilterRedirect(recordHistoryView, search, location.state);
		if (removed) throw redirect({ to: "/requesting/$recordId/history", params, ...removed });
	},
	head: () => ({ meta: [{ title: pageTitle("requesting.history") }] }),
	component: ClusterHistory,
});
