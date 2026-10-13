import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import TodayPage from "@components/Today/TodayPage";
import { pageTitle } from "@helpers/pageTitle";

const todaySearchSchema = z.object({
	window: z.enum(["day", "visit"]).optional().catch(undefined),
});

export const Route = createFileRoute("/__authenticated/")({
	validateSearch: todaySearchSchema,
	head: () => ({ meta: [{ title: pageTitle("nav.today.title") }] }),
	component: TodayPage,
});
