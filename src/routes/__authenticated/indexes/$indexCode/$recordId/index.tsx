import { createFileRoute } from "@tanstack/react-router";

import ClusterRecordComponent from "@components/ClusterRecord/ClusterRecordComponent";

export const Route = createFileRoute(
	"/__authenticated/indexes/$indexCode/$recordId/"
)({
	component: ClusterRecordComponent,
});
