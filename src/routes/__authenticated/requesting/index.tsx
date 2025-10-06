import { createFileRoute } from "@tanstack/react-router";
import { SharedIndexV2 } from "@components/SharedIndexes/SharedIndexV2";

export const Route = createFileRoute("/__authenticated/requesting/")({
	component: SharedIndexV2,
});
