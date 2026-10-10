import { createFileRoute } from "@tanstack/react-router";
import { pageTitle } from "@helpers/pageTitle";
import ClusterRecordInfo from "@components/ClusterRecord/ClusterRecordInfo";

export const Route = createFileRoute("/__authenticated/requesting/$recordId/")({
	head: () => ({
		meta: [{ title: pageTitle("requesting.record_information") }],
	}),
	component: ClusterRecordInfo,
});
