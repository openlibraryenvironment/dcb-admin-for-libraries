import { createFileRoute } from "@tanstack/react-router";
import { SharedIndexComponent } from "@components/SharedIndexes/SharedIndexComponent";

export const Route = createFileRoute("/__authenticated/indexes/$indexCode/")({
	component: SharedIndexComponent,
});
