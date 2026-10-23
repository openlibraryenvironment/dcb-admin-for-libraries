import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

import { ALL_PANELS, panelsOf, selectPanels } from "@helpers/insightsSelection";
import { INSIGHTS_PAGES, selectPages } from "@helpers/insightsPages";
import { isInsightsPageShown } from "@helpers/featureFlags";
import { isInsightsPanelShown, isInsightsSectionShown } from "@helpers/insightsPanelFlags";
import { resolveSubject, visibleSubjects } from "@helpers/insightsSubjects";

const shown = (raw: string | undefined) => [...selectPanels(raw).shown].sort();

describe("VITE_INSIGHTS_PANELS", () => {
	it("shows everything when unset or blank, which envsubst makes of an unset variable", () => {
		for (const raw of [undefined, "", " , "]) {
			expect(shown(raw)).toEqual([...ALL_PANELS].sort());
		}
	});

	it("shows everything for all", () => {
		expect(shown("all")).toEqual([...ALL_PANELS].sort());
	});

	it("leaves out a section or a panel after all", () => {
		const left = selectPanels("all,-partners,-gaps.rareGems").shown;
		expect(left.has("partners.netFlow")).toBe(false);
		expect(left.has("partners.tradingPartners")).toBe(false);
		expect(left.has("gaps.rareGems")).toBe(false);
		expect(left.has("gaps.unmetLocal")).toBe(true);
		expect(left.size).toBe(ALL_PANELS.length - 3);
	});

	it("shows exactly what a list names, a section standing for its panels", () => {
		expect(shown("overview,service.durations")).toEqual(
			[...panelsOf("overview"), "service.durations"].sort(),
		);
	});

	it("applies names left to right", () => {
		expect(shown("service,-service.walkUp")).toEqual(
			panelsOf("service")
				.filter((panel) => panel !== "service.walkUp")
				.sort(),
		);
		expect(shown("-service.walkUp,all")).toEqual([...ALL_PANELS].sort());
	});

	it("reports a name it does not know, and shows what it does", () => {
		const { shown: left, unknown } = selectPanels("all,-gaps.rareGem, trends.nothing");
		expect(unknown).toEqual(["-gaps.rareGem", "trends.nothing"]);
		expect(left.has("gaps.rareGems")).toBe(true);
	});

	it("names every panel once", () => {
		expect(new Set(ALL_PANELS).size).toBe(ALL_PANELS.length);
	});
});

describe("VITE_INSIGHTS_PAGES", () => {
	it("shows every page when unset, and none for an empty list of names", () => {
		expect([...selectPages(undefined).shown]).toEqual([...INSIGHTS_PAGES]);
		expect([...selectPages("-insights").shown]).toEqual([]);
	});
});

describe("what a deployment shows", () => {
	const deploy = (env: Record<string, string>) =>
		vi.stubGlobal("window", { __APP_ENV__: { VITE_FEATURE_INSIGHTS: "true", ...env } });

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it("shows no page while the release flag is off, whatever the list says", () => {
		deploy({ VITE_FEATURE_INSIGHTS: "false", VITE_INSIGHTS_PAGES: "all" });
		expect(isInsightsPageShown("insights")).toBe(false);
	});

	it("hides a page the list leaves out", () => {
		deploy({ VITE_INSIGHTS_PAGES: "all,-insights" });
		expect(isInsightsPageShown("insights")).toBe(false);
		deploy({ VITE_INSIGHTS_PAGES: "all" });
		expect(isInsightsPageShown("insights")).toBe(true);
	});

	it("keeps a panel off while the release it needs is not deployed", () => {
		deploy({ VITE_INSIGHTS_PANELS: "all" });
		expect(isInsightsPanelShown("service.walkUp")).toBe(false);
		expect(isInsightsPanelShown("trends.durationTrend")).toBe(false);
		deploy({
			VITE_INSIGHTS_PANELS: "all",
			VITE_FEATURE_INSIGHTS_WALK_UP: "true",
			VITE_FEATURE_INSIGHTS_TRENDS: "true",
		});
		expect(isInsightsPanelShown("service.walkUp")).toBe(true);
		expect(isInsightsPanelShown("trends.durationTrend")).toBe(true);
	});

	it("hides a subject with no panel shown, and falls back from a link to it", () => {
		deploy({ VITE_INSIGHTS_PANELS: "all,-trends,-gaps" });
		expect(isInsightsSectionShown("trends")).toBe(false);
		expect(visibleSubjects()).toEqual(["service", "demand", "partners", "collection"]);
		expect(resolveSubject("trends")).toBe("service");
		expect(resolveSubject("gaps")).toBe("service");
		expect(resolveSubject("demand")).toBe("demand");
	});

	it("warns once for a name it does not know, without repeating it on every read", () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
		deploy({ VITE_INSIGHTS_PANELS: "all,-nope" });
		isInsightsPanelShown("overview.headline");
		isInsightsPanelShown("overview.moreFigures");
		expect(warn).toHaveBeenCalledTimes(1);
		expect(warn.mock.calls[0][0]).not.toContain("nope");
	});
});

describe("docs/DEPLOYMENT.md, 2d", () => {
	const doc = readFileSync(path.resolve(process.cwd(), "docs/DEPLOYMENT.md"), "utf8").replace(
		/\r\n/g,
		"\n",
	);
	const table = (header: string) => {
		const start = doc.indexOf(header);
		expect(start, header).toBeGreaterThan(-1);
		return doc.slice(start, doc.indexOf("\n\n", start));
	};

	it("lists every panel, and none this app lacks", () => {
		const listed = [...table("| Subject | Panels |").matchAll(/`([a-z]+\.[A-Za-z]+)`/g)];
		expect(listed.map((match) => match[1]).sort()).toEqual([...ALL_PANELS].sort());
	});

	it("lists every page, and none this app lacks", () => {
		const listed = [...table("| Page | Name |").matchAll(/`([a-z]+)`/g)];
		expect(listed.map((match) => match[1])).toEqual([...INSIGHTS_PAGES]);
	});
});
