import { createFileRoute, notFound } from "@tanstack/react-router";
import { validate } from "uuid";
import { pageTitle } from "@helpers/pageTitle";
import ClusterRecordLayout from "@components/ClusterRecord/ClusterRecordLayout";

export const Route = createFileRoute("/__authenticated/requesting/$recordId")({
	// Before anything is fetched: a record id that is not a UUID would otherwise be
	// sent to the shared index and fanned out to every member LMS for availability.
	beforeLoad: ({ params }) => {
		if (!validate(params.recordId)) throw notFound();
	},
	head: () => ({ meta: [{ title: pageTitle("requesting.cluster") }] }),
	component: ClusterRecordLayout,
});
