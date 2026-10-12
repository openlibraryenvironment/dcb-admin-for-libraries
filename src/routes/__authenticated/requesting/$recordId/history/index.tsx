import { createFileRoute } from "@tanstack/react-router";
import { pageTitle } from "@helpers/pageTitle";
import { recordHistoryGrid } from "@helpers/dataGrid/gridDefinitions";
import ClusterHistory from "@components/ClusterRecord/ClusterHistory";

export const Route = createFileRoute(
	"/__authenticated/requesting/$recordId/history/",
)({
	validateSearch: recordHistoryGrid.searchSchema,
	head: () => ({ meta: [{ title: pageTitle("requesting.history") }] }),
	component: ClusterHistory,
});
