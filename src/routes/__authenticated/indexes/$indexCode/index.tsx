import { createFileRoute } from "@tanstack/react-router";
import { requestingSearchSchema } from "@helpers/requestingSearch";
import { SharedIndexV2 } from "@components/SharedIndexes/SharedIndexV2";

export const Route = createFileRoute("/__authenticated/indexes/$indexCode/")({
	validateSearch: requestingSearchSchema,
	component: SharedIndexV2,
});
