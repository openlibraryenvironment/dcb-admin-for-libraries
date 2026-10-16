import { createFileRoute } from "@tanstack/react-router";
import { pageTitle } from "@helpers/pageTitle";
import ClusterItems from "@components/ClusterRecord/ClusterItems";

export const Route = createFileRoute(
	"/__authenticated/requesting/$recordId/items/",
)({
	head: () => ({ meta: [{ title: pageTitle("requesting.items") }] }),
	component: ClusterItems,
	// Per record: its grids' filters and pages are not the next record's
	remountDeps: ({ params }) => params.recordId,
});
