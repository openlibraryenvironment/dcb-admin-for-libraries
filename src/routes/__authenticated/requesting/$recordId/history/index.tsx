import { createFileRoute } from "@tanstack/react-router";
import { pageTitle } from "@helpers/pageTitle";
import ClusterHistory from "@components/ClusterRecord/ClusterHistory";

export const Route = createFileRoute(
	"/__authenticated/requesting/$recordId/history/",
)({
	head: () => ({ meta: [{ title: pageTitle("requesting.history") }] }),
	component: ClusterHistory,
});
