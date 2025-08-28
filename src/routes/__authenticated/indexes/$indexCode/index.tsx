import { createFileRoute } from "@tanstack/react-router";
import { SharedIndexComponent } from "@components/SharedIndexes/SharedIndexComponent";
import { SharedIndexV2 } from "@components/SharedIndexes/SharedIndexV2";

export const Route = createFileRoute("/__authenticated/indexes/$indexCode/")({
	component: SharedIndexV2,
});
