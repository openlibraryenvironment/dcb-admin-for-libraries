import { createFileRoute } from "@tanstack/react-router";

import ClusterRecordComponent from "../../../../components/ClusterRecord/ClusterRecordComponent"

export const Route = createFileRoute("/indexes/$indexCode/$recordId/")({
	component: ClusterRecordComponent,
});
