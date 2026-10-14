import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import HomePage from "@components/Home/HomePage";
import { pageTitle } from "@helpers/pageTitle";

const homeSearchSchema = z.object({
	window: z.enum(["today", "week", "month", "visit"]).optional().catch(undefined),
});

export const Route = createFileRoute("/__authenticated/")({
	validateSearch: homeSearchSchema,
	head: () => ({ meta: [{ title: pageTitle("nav.home.title") }] }),
	component: HomePage,
});
