import { pageTitle } from "@helpers/pageTitle";
import { requestingSearchSchema } from "@helpers/requestingSearch";
import { createFileRoute } from "@tanstack/react-router";
import { SharedIndexV2 } from "@components/SharedIndexes/SharedIndexV2";

export const Route = createFileRoute("/__authenticated/requesting/")({
	validateSearch: requestingSearchSchema,
	head: () => ({ meta: [{ title: pageTitle("nav.requesting.title") }] }),
	component: SharedIndexV2,
});
