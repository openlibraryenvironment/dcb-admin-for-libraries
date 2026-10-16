import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
	accessibility,
	e2eTests,
	gateResults,
	junitCounts,
	render,
	verdict,
	vpatConformance,
	type E2ETest,
	type Inputs,
} from "../scripts/release-report";

const axe = (rules: object[]) => Buffer.from(JSON.stringify(rules)).toString("base64");

const playwrightReport = {
	suites: [
		{
			suites: [
				{
					specs: [
						{
							file: "accessibility.spec.ts",
							title: "home has no violations",
							tags: ["a11y"],
							tests: [
								{
									status: "expected" as const,
									annotations: [
										{ type: "covers", description: "Every check axe can automate passes, in light mode." },
										{ type: "page", description: "home" },
										{ type: "view", description: "light" },
									],
									results: [
										{
											attachments: [
												{
													name: "axe",
													body: axe([{ id: "color-contrast", help: "Contrast", outcome: "passed", criteria: ["1.4.3"] }]),
												},
											],
										},
									],
								},
							],
						},
					],
				},
			],
			specs: [
				{
					file: "focus-ring.spec.ts",
					title: "a focused icon button shows its ring (dark)",
					tags: ["a11y", "wcag-2.4.7"],
					tests: [
						{
							status: "flaky" as const,
							annotations: [{ type: "covers", description: "A focused icon button shows a focus ring." }],
							results: [{ attachments: [] }, { attachments: [] }],
						},
					],
				},
			],
		},
	],
};

const scan = (page: string, view: string, outcome: E2ETest["outcome"], ruleOutcome: "passed" | "failed"): E2ETest => ({
	file: "accessibility.spec.ts",
	title: `${page} ${view}`,
	tags: ["a11y"],
	page,
	view,
	outcome,
	axe: [{ id: "color-contrast", help: "Contrast", outcome: ruleOutcome, criteria: ["1.4.3"] }],
});

const inputs = (overrides: Partial<Inputs> = {}): Inputs => ({
	statuses: {},
	junit: {},
	vpat: new Map(),
	pipeline: { when: new Date("2026-10-16T12:00:00Z") },
	...overrides,
});

describe("junitCounts", () => {
	it("reads Playwright's counts from the root element", () => {
		const xml = `<testsuites id="" name="" tests="10" failures="1" skipped="2" errors="1" time="3">`;
		expect(junitCounts(xml)).toEqual({ tests: 10, failed: 2, skipped: 2, passed: 6 });
	});

	it("counts skipped tests where Vitest leaves the attribute out", () => {
		const xml = `<testsuites name="vitest tests" tests="3" failures="0" errors="0"><testcase><skipped/></testcase></testsuites>`;
		expect(junitCounts(xml)).toEqual({ tests: 3, failed: 0, skipped: 1, passed: 2 });
	});
});

describe("e2eTests", () => {
	const tests = e2eTests(playwrightReport);

	it("finds tests at every depth, with what they cover and where they looked", () => {
		expect(tests.map((test) => [test.title, test.outcome, test.page, test.view])).toEqual([
			["a focused icon button shows its ring (dark)", "flaky", undefined, undefined],
			["home has no violations", "passed", "home", "light"],
		]);
		expect(tests[0].covers).toBe("A focused icon button shows a focus ring.");
	});

	it("decodes what axe found from the test's attachment", () => {
		expect(tests[1].axe).toEqual([{ id: "color-contrast", help: "Contrast", outcome: "passed", criteria: ["1.4.3"] }]);
	});
});

describe("vpatConformance", () => {
	const vpat = vpatConformance(readFileSync("docs/DCB_Admin_for_Libraries_VPAT.md", "utf8"));

	it("reads the stated conformance of each criterion from the VPAT", () => {
		expect(vpat.get("1.4.10")).toBe("Supports");
		expect(vpat.get("2.2.1")).toBe("Partially supports");
		expect(vpat.get("3.2.6")).toBe("Not applicable");
	});

	it("reads a row whose bold sits outside its link", () => {
		expect(vpat.get("1.2.4")).toBe("Not applicable");
	});
});

describe("accessibility", () => {
	const model = accessibility(
		[
			scan("home", "light", "passed", "passed"),
			scan("home", "phone width", "failed", "failed"),
			{ file: "focus-ring.spec.ts", title: "ring", tags: ["a11y", "wcag-2.4.7"], covers: "A ring.", outcome: "passed", axe: [] },
			{ file: "other.spec.ts", title: "not accessibility", tags: [], outcome: "failed", axe: [] },
		],
		new Map([["3.3.8", "Supports"]]),
	);
	const row = (id: string) => model.criteria.find((criterion) => criterion.id === id);

	it("places each scan by page and view", () => {
		expect(model.matrix).toEqual([{ page: "home", cells: ["passed", undefined, "failed"] }]);
		expect(model.problems).toBe(1);
	});

	it("says how each criterion was checked, and what was found", () => {
		expect(row("1.4.3")).toMatchObject({ scans: { checked: 2, failed: 1 }, result: "failed" });
		expect(row("2.4.7")?.result).toBe("passed");
		expect(row("3.3.8")).toMatchObject({ result: "by hand", handAssessed: "Supports" });
	});

	it("names the axe rules behind an automated criterion", () => {
		expect(row("1.4.3")?.rules).toEqual(["Contrast"]);
	});

	it("lists every A and AA criterion WCAG 2.2 has, and not the one it removed", () => {
		expect(model.criteria).toHaveLength(55);
		expect(row("4.1.1")).toBeUndefined();
	});
});

describe("gateResults and verdict", () => {
	it("explains every check, and says which did not run", () => {
		const results = gateResults(inputs({ statuses: { verify_static: "success", verify_e2e: "failed" } }));
		expect(results.find((result) => result.job === "verify_static")?.outcome).toBe("passed");
		expect(results.find((result) => result.job === "verify_e2e")?.outcome).toBe("failed");
		expect(results.find((result) => result.job === "verify_image")?.outcome).toBe("not run");
		expect(verdict(results)).toBe(`1 of ${results.length} checks failed.`);
	});

	it("does not call a pipeline clean when checks did not run", () => {
		const results = gateResults(inputs({ statuses: { verify_static: "success" } }));
		expect(verdict(results)).toMatch(/^Every check that ran passed\. \d+ of \d+ did not run/);
	});
});

describe("render", () => {
	it("escapes what it is given, so a test title cannot inject markup", () => {
		const html = render(
			inputs({
				e2e: [{ file: "x.spec.ts", title: "<script>alert(1)</script>", tags: [], outcome: "failed", axe: [] }],
			}),
		);
		expect(html).not.toContain("<script>");
		expect(html).toContain("&lt;script&gt;");
	});

	it("reports evidence for a criterion, and takes its conformance only from the VPAT", () => {
		const html = render(
			inputs({
				e2e: [scan("home", "light", "passed", "passed")],
				vpat: new Map([["1.4.3", "Partially supports"]]),
			}),
		);
		const contrast = html.split("1.4.3 Contrast (Minimum)")[1].split("</tr>")[0];
		expect(contrast).toContain("no problems found");
		expect(contrast).toContain("Partially supports");
		expect(contrast).not.toContain("Passed");
	});

	it("is one document with a language and a single main heading", () => {
		const html = render(inputs());
		expect(html).toMatch(/^<!doctype html>\n<html lang="en">/);
		expect(html.match(/<h1>/g)).toHaveLength(1);
	});
});
