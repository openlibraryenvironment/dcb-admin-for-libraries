import { createFileRoute } from "@tanstack/react-router";
import ClusterItems from "@components/ClusterRecord/ClusterItems";

export const Route = createFileRoute(
	"/__authenticated/requesting/$recordId/items/",
)({
	component: ClusterItems,
});
