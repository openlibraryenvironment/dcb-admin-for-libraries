// The release report: what every check in a pipeline found, written for someone who does not
// read code. What it reads, and where it is published: docs/testing.md, "The release report".
//
// Usage: npm run report    reads reports/ and .lighthouseci/, writes reports/release-report.html
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { AxeRuleOutcome } from "../e2e/fixtures/axe";
import gates from "./gates.json" with { type: "json" };
import wcag from "./wcag-criteria.json" with { type: "json" };

type Outcome = "passed" | "failed" | "not run";
type TestOutcome = "passed" | "failed" | "flaky" | "skipped";

export interface Counts {
	tests: number;
	passed: number;
	failed: number;
	skipped: number;
}

export interface E2ETest {
	file: string;
	title: string;
	tags: string[];
	covers?: string;
	page?: string;
	view?: string;
	outcome: TestOutcome;
	axe: AxeRuleOutcome[];
}

export interface Budget {
	firstLoad: { size: number; budget: number };
	routes: { name: string; size: number | null; budget: number }[];
	onDemand: { name: string; size: number | null; budget: number }[];
}

export interface Lighthouse {
	scores: Record<string, number>;
	failures: { auditId: string; level: string; actual: number; expected: number }[];
}

export interface UnitCase {
	file: string;
	name: string;
	outcome: "passed" | "failed" | "skipped";
}

export interface Figure {
	label: string;
	value: number;
}

export interface Inputs {
	statuses: Record<string, string>;
	e2e?: E2ETest[];
	junit: Record<string, Counts | undefined>;
	budget?: Budget;
	lighthouse?: Lighthouse;
	vpat: Map<string, string>;
	/** The last release's report data, which this build's figures are compared with */
	previous?: { figures?: Figure[]; pipeline?: { tag?: string } };
	/** The last nightly flake hunt's browser tests */
	nightly?: UnitCase[];
	/** No version: on the release branch, semantic-release chooses it after this is built */
	pipeline: { ref?: string; commit?: string; tag?: string; commitUrl?: string; pipelineUrl?: string; vpatUrl?: string; when: Date };
}

/** Each test case in a JUnit file, as the nightly flake hunt writes them. */
export function unitCases(xml: string): UnitCase[] {
	const attribute = (attributes: string, name: string) => new RegExp(`\\b${name}="([^"]*)"`).exec(attributes)?.[1] ?? "";
	return [...xml.matchAll(/<testcase\b([^>]*?)(?:\/>|>([\s\S]*?)<\/testcase>)/g)].map(([, attributes, body = ""]) => ({
		file: attribute(attributes, "classname"),
		name: attribute(attributes, "name"),
		outcome: /<(failure|error)\b/.test(body) ? "failed" : /<skipped\b/.test(body) ? "skipped" : "passed",
	}));
}

/** The counts on a JUnit file's root element. Vitest leaves out `skipped`, so it is counted. */
export function junitCounts(xml: string): Counts {
	const root = /<testsuites\b([^>]*)>/.exec(xml)?.[1] ?? "";
	const attr = (name: string) => {
		const value = new RegExp(`\\b${name}="(\\d+)"`).exec(root)?.[1];
		return value === undefined ? undefined : Number(value);
	};
	const tests = attr("tests") ?? 0;
	const failed = (attr("failures") ?? 0) + (attr("errors") ?? 0);
	const skipped = attr("skipped") ?? (xml.match(/<skipped\b/g) ?? []).length;
	return { tests, failed, skipped, passed: tests - failed - skipped };
}

interface PwSuite {
	specs?: PwSpec[];
	suites?: PwSuite[];
}
interface PwSpec {
	file: string;
	title: string;
	tags: string[];
	tests: {
		status: "expected" | "unexpected" | "flaky" | "skipped";
		annotations: { type: string; description?: string }[];
		results: { attachments: { name: string; body?: string }[] }[];
	}[];
}

const TEST_OUTCOME = { expected: "passed", unexpected: "failed", flaky: "flaky", skipped: "skipped" } as const;

/** Every test in a Playwright JSON report, with what it covers and what axe found on its page. */
export function e2eTests(report: { suites: PwSuite[] }): E2ETest[] {
	const tests: E2ETest[] = [];
	const walk = (suite: PwSuite) => {
		for (const spec of suite.specs ?? []) {
			for (const test of spec.tests) {
				const annotation = (type: string) =>
					test.annotations.find((entry) => entry.type === type)?.description;
				const last = test.results.at(-1);
				tests.push({
					file: spec.file,
					title: spec.title,
					tags: spec.tags,
					covers: annotation("covers"),
					page: annotation("page"),
					view: annotation("view"),
					outcome: TEST_OUTCOME[test.status],
					axe: (last?.attachments ?? [])
						.filter((attachment) => attachment.name === "axe" && attachment.body)
						.flatMap((attachment) =>
							JSON.parse(Buffer.from(attachment.body ?? "", "base64").toString("utf8")) as AxeRuleOutcome[],
						),
				});
			}
		}
		suite.suites?.forEach(walk);
	};
	report.suites.forEach(walk);
	return tests;
}

/**
 * The conformance the VPAT states for each criterion: "1.4.10" -> "Supports". A row opens
 * `| [**1.4.10 Reflow**](…)` or `| **[1.2.4 Captions (Live)](…)**`; the next cell is the level.
 */
export function vpatConformance(markdown: string): Map<string, string> {
	const levels = new Map<string, string>();
	for (const line of markdown.split("\n")) {
		const cells = line.split("|");
		const criterion = /^\s*(?:\[\*\*|\*\*\[)(\d+\.\d+\.\d+)/.exec(cells[1] ?? "")?.[1];
		const level = cells[2]?.trim();
		if (criterion && level) levels.set(criterion, level);
	}
	return levels;
}

const VIEWS = ["light", "dark", "phone width"];

export interface CriterionRow {
	id: string;
	level: string;
	name: string;
	plain: string;
	scans: { checked: number; failed: number };
	/** What the axe rules for this criterion check, in axe's words */
	rules: string[];
	tests: E2ETest[];
	handAssessed?: string;
	result: "passed" | "failed" | "by hand";
}

export function accessibility(tests: E2ETest[], vpat: Map<string, string>) {
	const a11y = tests.filter((test) => test.tags.includes("a11y"));
	const scans = a11y.filter((test) => test.page && test.view);
	const pages = [...new Set(scans.map((scan) => scan.page as string))];
	const cell = (page: string, view: string) =>
		scans.find((scan) => scan.page === page && scan.view === view)?.outcome;

	const failedRule = (rule: AxeRuleOutcome) => rule.outcome !== "passed";
	const row = (id: string): CriterionRow => {
		const { level, name, plain } = wcag[id as keyof typeof wcag];
		const checkedBy = scans.filter((scan) => scan.axe.some((rule) => rule.criteria.includes(id)));
		const failed = checkedBy.filter((scan) =>
			scan.axe.some((rule) => rule.criteria.includes(id) && failedRule(rule)),
		).length;
		const rules = [
			...new Set(
				checkedBy.flatMap((scan) =>
					scan.axe.filter((rule) => rule.criteria.includes(id)).map((rule) => rule.help),
				),
			),
		].sort();
		const own = a11y.filter((test) => test.tags.includes(`wcag-${id}`));
		const tested = checkedBy.length > 0 || own.length > 0;
		const anyFailed = failed > 0 || own.some((test) => test.outcome === "failed");
		return {
			id,
			level,
			name,
			plain,
			scans: { checked: checkedBy.length, failed },
			rules,
			tests: own,
			handAssessed: vpat.get(id),
			result: !tested ? "by hand" : anyFailed ? "failed" : "passed",
		};
	};
	const ids = Object.keys(wcag).filter((id) => id !== "4.1.1");
	const criteria = ids.filter((id) => wcag[id as keyof typeof wcag].level !== "AAA").map(row);
	const beyond = ids
		.filter((id) => wcag[id as keyof typeof wcag].level === "AAA")
		.map(row)
		.filter((criterion) => criterion.result !== "by hand");
	return {
		tests: a11y,
		scans,
		pages,
		matrix: pages.map((page) => ({ page, cells: VIEWS.map((view) => cell(page, view)) })),
		problems: scans.filter((scan) => scan.outcome === "failed").length,
		criteria,
		beyond,
	};
}

export interface GateResult {
	job: string;
	title: string;
	checks: string;
	matters: string;
	outcome: Outcome;
	detail?: string;
}

const number = (value: number) => value.toLocaleString("en-GB");
const kb = (bytes: number) => `${number(Math.round(bytes / 1024))} KB`;
const sentenceCase = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
const counted = (counts: Counts | undefined, noun: string) => {
	if (!counts) return undefined;
	return counts.failed > 0
		? `${number(counts.failed)} of ${number(counts.tests)} ${noun} failed.`
		: `${number(counts.passed)} ${noun} passed${counts.skipped ? `, ${number(counts.skipped)} skipped` : ""}.`;
};

export function gateResults(inputs: Inputs): GateResult[] {
	const outcome = (job: string): Outcome => {
		const status = inputs.statuses[job];
		if (status === "success" || status === "passed") return "passed";
		if (status === "failed" || status === "canceled") return "failed";
		return "not run";
	};
	const e2e = inputs.e2e;
	const flaky = e2e?.filter((test) => test.outcome === "flaky").length ?? 0;
	const details: Record<string, string | undefined> = {
		verify_static: counted(inputs.junit.unit, "unit tests"),
		verify_e2e: e2e
			? `${number(e2e.filter((test) => test.outcome === "passed" || test.outcome === "flaky").length)} of ${number(e2e.length)} browser tests passed${flaky ? `; ${number(flaky)} passed only when tried again` : ""}.`
			: undefined,
		verify_base_path: counted(inputs.junit.basePath, "browser tests"),
		verify_ki_bootstrap: counted(inputs.junit.kiBootstrap, "browser tests"),
		verify_performance: inputs.budget
			? `First load ${kb(inputs.budget.firstLoad.size)}, budget ${kb(inputs.budget.firstLoad.budget)}.`
			: undefined,
	};
	return Object.entries(gates).map(([job, gate]) => ({
		job,
		...gate,
		outcome: outcome(job),
		detail: details[job],
	}));
}

export function verdict(results: GateResult[]): string {
	const failed = results.filter((result) => result.outcome === "failed");
	const notRun = results.filter((result) => result.outcome === "not run");
	if (failed.length > 0) return `${failed.length} of ${results.length} checks failed.`;
	if (notRun.length > 0)
		return `Every check that ran passed. ${notRun.length} of ${results.length} did not run in this pipeline.`;
	return `All ${results.length} checks passed.`;
}

const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const escape = (text: string) => text.replace(/[&<>"']/g, (character) => ESCAPES[character] ?? character);

const MARK: Record<string, string> = {
	passed: "✓ Passed",
	flaky: "✓ Passed on a second try",
	failed: "✗ Failed",
	skipped: "– Skipped",
	"not run": "– Not run",
};
const mark = (outcome: string | undefined) =>
	`<span class="${outcome === "failed" ? "bad" : outcome === "passed" || outcome === "flaky" ? "good" : "muted"}">${escape(MARK[outcome ?? "not run"] ?? outcome ?? "")}</span>`;

const link = (url: string | undefined, text: string) =>
	url ? `<a href="${escape(url)}">${escape(text)}</a>` : escape(text);

/** A wide table scrolls inside itself on a phone, and that scroller is reachable by keyboard. */
const table = (label: string, head: string[], rows: string[][]) => `
<div class="scroll" role="region" aria-label="${escape(label)}" tabindex="0">
<table>
<caption>${escape(label)}</caption>
<thead><tr>${head.map((cell) => `<th scope="col">${escape(cell)}</th>`).join("")}</tr></thead>
<tbody>${rows.map(([first, ...rest]) => `<tr><th scope="row">${first}</th>${rest.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("\n")}</tbody>
</table>
</div>`;

const STYLE = `
:root { color-scheme: light dark; --bg: #ffffff; --text: #1a1a1a; --muted: #555555; --line: #c8c8c8; --good: #1b6e2a; --bad: #b3261e; --link: #0b57d0; --panel: #f4f4f4; }
@media (prefers-color-scheme: dark) { :root { --bg: #121212; --text: #ececec; --muted: #b4b4b4; --line: #4a4a4a; --good: #7bd88f; --bad: #ff8a80; --link: #8ab4f8; --panel: #1e1e1e; } }
body { margin: 0; background: var(--bg); color: var(--text); font: 16px/1.5 system-ui, sans-serif; }
header, main, footer { max-width: 64rem; margin: 0 auto; padding: 1rem; }
a { color: var(--link); }
.meta, .muted, caption { color: var(--muted); }
caption { text-align: left; padding: 0.25rem 0; }
.verdict { font-size: 1.25rem; padding: 0.75rem 1rem; background: var(--panel); border-left: 0.25rem solid var(--line); }
.good { color: var(--good); font-weight: 600; } .bad { color: var(--bad); font-weight: 600; }
.scroll { overflow-x: auto; margin: 0.5rem 0 1.5rem; }
table { border-collapse: collapse; width: 100%; }
th, td { text-align: left; vertical-align: top; padding: 0.4rem 0.6rem; border-bottom: 1px solid var(--line); }
details { margin: 0.5rem 0 1.5rem; } td details { margin: 0.25rem 0; } summary { cursor: pointer; }
`;

/** What the tests found for one criterion: evidence, not a conformance claim, which is the VPAT's. */
function evidence(criterion: CriterionRow): string {
	const found: string[] = [];
	if (criterion.scans.checked) {
		const rules = criterion.rules.length === 1 ? "1 automated rule" : `${number(criterion.rules.length)} automated rules`;
		const outcome = criterion.scans.failed
			? `<span class="bad">✗ problems on ${number(criterion.scans.failed)}</span>`
			: "no problems found";
		found.push(
			`${rules} on ${number(criterion.scans.checked)} page checks: ${outcome}.<details><summary>What the rules for ${criterion.id} check</summary><ul>${criterion.rules.map((rule) => `<li>${escape(rule)}</li>`).join("")}</ul></details>`,
		);
	}
	if (criterion.tests.length) {
		const failed = criterion.tests.filter((test) => test.outcome === "failed").length;
		found.push(
			`${number(criterion.tests.length)} of our own tests: ${failed ? `<span class="bad">✗ ${number(failed)} failed</span>` : "all passed"}.`,
		);
	}
	return found.length ? found.join("<br>") : "Not testable automatically; assessed by hand.";
}

/** The numbers worth comparing from one release to the next. */
export function figures(inputs: Inputs): Figure[] {
	const a11y = inputs.e2e ? accessibility(inputs.e2e, inputs.vpat) : undefined;
	const out: Figure[] = [];
	const add = (label: string, value: number | undefined) => {
		if (value !== undefined) out.push({ label, value });
	};
	add("What every page loads first, KB", inputs.budget && Math.round(inputs.budget.firstLoad.size / 1024));
	add("Unit tests", inputs.junit.unit?.tests);
	add("Browser tests", inputs.e2e?.length);
	add("Accessibility page checks", a11y?.scans.length);
	add("Accessibility problems found", a11y?.problems);
	for (const [category, score] of Object.entries(inputs.lighthouse?.scores ?? {})) {
		add(`Lighthouse ${category.replace("-", " ")} on the sign-in page`, score);
	}
	return out;
}

export function render(inputs: Inputs): string {
	const results = gateResults(inputs);
	const a11y = inputs.e2e ? accessibility(inputs.e2e, inputs.vpat) : undefined;
	const { pipeline } = inputs;
	const when = new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeStyle: "short", timeZone: "UTC" }).format(pipeline.when);

	const checks = table(
		"Every check in this pipeline",
		["Check", "Result", "What it checks", "Why it matters"],
		results.map((result) => [
			escape(result.title),
			`${mark(result.outcome)}${result.detail ? `<br><span class="muted">${escape(result.detail)}</span>` : ""}`,
			escape(result.checks),
			escape(result.matters),
		]),
	);

	const accessibilitySection = a11y
		? `
<h2>Accessibility: WCAG 2.2 level AA</h2>
<p>${number(a11y.pages.length)} pages, each checked in light mode, dark mode and at phone width: ${number(a11y.scans.length)} page checks, ${a11y.problems === 0 ? "no problems found by the automated rules" : `<span class="bad">✗ ${number(a11y.problems)} with problems</span>`}. ${number(a11y.tests.length - a11y.scans.length)} further tests check things an automated rule cannot.</p>
${table(
	"Pages checked",
	["Page", "Light mode", "Dark mode", "Phone width"],
	a11y.matrix.map(({ page, cells }) => [escape(sentenceCase(page)), ...cells.map(mark)]),
)}
<h3>Each WCAG 2.2 A and AA success criterion</h3>
<p>Each criterion shows two things. What our tests found is evidence: automated rules (axe) run on every page check, and tests written for this application. An automated rule usually checks only part of a criterion, so “no problems found” does not by itself mean the criterion is met. Whether it is met is a judgement made by hand for every criterion and stated in the accessibility conformance report (VPAT), which the last column repeats.</p>
${table(
	"WCAG 2.2 A and AA",
	["Criterion", "What it means", "What our tests found", "Conformance, as the VPAT states it"],
	a11y.criteria.map((criterion) => [
		`${criterion.id} ${escape(criterion.name)} <span class="muted">(${criterion.level})</span>`,
		escape(criterion.plain),
		evidence(criterion),
		criterion.handAssessed ? escape(criterion.handAssessed) : `<span class="muted">Not stated</span>`,
	]),
)}
${
	a11y.beyond.length
		? `<p>Also covered by our tests, beyond level AA: ${a11y.beyond.map((criterion) => `${criterion.id} ${escape(criterion.name)}, ${criterion.result === "failed" ? "problems found" : "no problems found"}`).join("; ")}.</p>`
		: ""
}
<h3>What automated testing cannot tell you</h3>
<p>Automated checks find roughly a third of accessibility problems. The rest, including whether the application makes sense to someone using a screen reader, is assessed by hand and recorded, with where we know we fall short, in the ${link(pipeline.vpatUrl, "accessibility conformance report (VPAT)")}.</p>
<details><summary>Every accessibility test, and what it checks (${a11y.tests.length - a11y.scans.length} not counting the page scans)</summary>
<ul>${a11y.tests
				.filter((test) => !test.page)
				.map((test) => `<li>${mark(test.outcome)} ${escape(test.covers ?? test.title)}</li>`)
				.join("\n")}</ul>
</details>`
		: `<h2>Accessibility: WCAG 2.2 level AA</h2><p>The browser tests did not run in this pipeline, so there are no accessibility results.</p>`;

	const speed = inputs.budget || inputs.lighthouse
		? `
<h2>Speed</h2>
${inputs.budget ? `<p>Before any page can be used, the browser downloads ${kb(inputs.budget.firstLoad.size)}, against a budget of ${kb(inputs.budget.firstLoad.budget)}. ${(() => {
	const over = [...inputs.budget.routes, ...inputs.budget.onDemand].filter((entry) => entry.size !== null && entry.size > entry.budget);
	return over.length ? `Over their own budgets, which are reported rather than enforced: ${over.map((entry) => escape(entry.name)).join(", ")}.` : "Every page and feature is within its own budget.";
})()}</p>` : ""}
${inputs.lighthouse ? `<p>Google Lighthouse, on the sign-in page: ${Object.entries(inputs.lighthouse.scores).map(([category, score]) => `${escape(category.replace("-", " "))} ${score}`).join(", ")} (out of 100).${inputs.lighthouse.failures.length ? ` Over its limits: ${inputs.lighthouse.failures.map((failure) => `${escape(failure.auditId)} (${failure.level})`).join(", ")}.` : ""}</p>` : ""}`
		: "";

	const before = new Map((inputs.previous?.figures ?? []).map((figure) => [figure.label, figure.value]));
	const against = inputs.previous?.pipeline?.tag ?? "the last release";
	const comparison = `
<h2>Compared with the last release</h2>
${
	before.size
		? table(
				`This build against ${against}`,
				["Figure", "This build", sentenceCase(against), "Change"],
				figures(inputs).map(({ label, value }) => {
					const was = before.get(label);
					const change = was === undefined ? "" : value === was ? "same" : `${value > was ? "+" : ""}${number(value - was)}`;
					return [escape(label), number(value), was === undefined ? `<span class="muted">—</span>` : number(was), escape(change)];
				}),
			)
		: "<p>No earlier release report was available to compare with.</p>"
}`;

	const retried = (inputs.e2e ?? []).filter((test) => test.outcome === "flaky");
	const nightlyFailed = [...new Set((inputs.nightly ?? []).filter((test) => test.outcome === "failed").map((test) => test.name))];
	const bullets = (items: string[]) => (items.length ? `<ul>${items.map((item) => `<li>${escape(item)}</li>`).join("\n")}</ul>` : "");
	const reliability = `
<h2>Test reliability</h2>
<p>${inputs.e2e ? (retried.length ? `${number(retried.length)} browser tests passed only on a second try in this pipeline:` : "Every browser test that passed did so on its first try.") : "The browser tests did not run in this pipeline."}</p>
${bullets(retried.map((test) => test.covers ?? test.title))}
<p>${inputs.nightly ? `The last nightly flake hunt ran ${number(new Set(inputs.nightly.map((test) => test.name)).size)} browser tests several times each, with no retries: ${nightlyFailed.length ? `<span class="bad">${number(nightlyFailed.length)} failed at least once.</span>` : "none failed."}` : "No nightly flake-hunt result was available."}</p>
${bullets(nightlyFailed)}`;

	const failedTests = (inputs.e2e ?? []).filter((test) => test.outcome === "failed");
	return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Release report: DCB Admin for Libraries</title>
<style>${STYLE}</style>
</head>
<body>
<header>
<h1>DCB Admin for Libraries: release report</h1>
<p class="meta">${pipeline.commit ? `Commit ${link(pipeline.commitUrl, pipeline.commit)}` : "Built locally"}${pipeline.ref ? ` on branch ${escape(pipeline.ref)}` : ""}${pipeline.pipelineUrl ? `, ${link(pipeline.pipelineUrl, "pipeline")}` : ""}, ${escape(when)} UTC.</p>
</header>
<main>
<p class="verdict">${escape(verdict(results))}</p>
<h2>Checks</h2>
${checks}
${accessibilitySection}
${speed}
${comparison}
${reliability}
${failedTests.length ? `<h2>Failed tests</h2><ul>${failedTests.map((test) => `<li>${escape(test.covers ?? test.title)} <span class="muted">(${escape(test.file)})</span></li>`).join("\n")}</ul>` : ""}
</main>
<footer class="muted"><p>Made from the results of this pipeline's own checks, not written by hand. What each check covers is written next to the check itself.</p></footer>
</body>
</html>
`;
}

function main() {
	const read = (path: string) => (existsSync(path) ? readFileSync(path, "utf8") : undefined);
	const parse = <T>(path: string): T | undefined => {
		const text = read(path);
		return text === undefined ? undefined : (JSON.parse(text) as T);
	};
	const junit = (path: string) => {
		const xml = read(path);
		return xml === undefined ? undefined : junitCounts(xml);
	};

	const statusDir = join("reports", "status");
	const statuses: Record<string, string> = {};
	if (existsSync(statusDir)) {
		for (const file of readdirSync(statusDir).filter((name) => name.endsWith(".json"))) {
			const entry = parse<{ job: string; status: string }>(join(statusDir, file));
			if (entry) statuses[entry.job] = entry.status;
		}
	}

	const playwright = parse<{ suites: PwSuite[] }>(join("reports", "e2e.json"));
	const manifest = parse<{ isRepresentativeRun: boolean; summary: Record<string, number> }[]>(join(".lighthouseci", "manifest.json"));
	const representative = manifest?.find((run) => run.isRepresentativeRun) ?? manifest?.[0];
	const assertions = parse<{ auditId: string; level: string; actual: number; expected: number; passed: boolean }[]>(
		join(".lighthouseci", "assertion-results.json"),
	);
	const env = process.env;
	const blob = (path: string) => (env.CI_PROJECT_URL && env.CI_COMMIT_SHA ? `${env.CI_PROJECT_URL}/-/blob/${env.CI_COMMIT_SHA}/${path}` : undefined);

	const nightlyXml = read(join("reports", "nightly-junit.xml"));
	const inputs: Inputs = {
		statuses,
		e2e: playwright ? e2eTests(playwright) : undefined,
		junit: {
			unit: junit(join("reports", "unit-junit.xml")),
			basePath: junit(join("reports", "base-path-junit.xml")),
			kiBootstrap: junit(join("reports", "ki-bootstrap-junit.xml")),
		},
		budget: parse<Budget>(join("reports", "bundle-budget.json")),
		lighthouse: representative
			? {
					scores: Object.fromEntries(Object.entries(representative.summary).map(([category, score]) => [category, Math.round(score * 100)])),
					failures: (assertions ?? []).filter((assertion) => !assertion.passed),
				}
			: undefined,
		vpat: vpatConformance(read(join("docs", "DCB_Admin_for_Libraries_VPAT.md")) ?? ""),
		previous: parse<NonNullable<Inputs["previous"]>>(join("reports", "previous-report.json")),
		nightly: nightlyXml === undefined ? undefined : unitCases(nightlyXml),
		pipeline: {
			ref: env.CI_COMMIT_REF_NAME,
			commit: env.CI_COMMIT_SHORT_SHA,
			tag: env.CI_COMMIT_TAG,
			commitUrl: env.CI_PROJECT_URL && env.CI_COMMIT_SHA ? `${env.CI_PROJECT_URL}/-/commit/${env.CI_COMMIT_SHA}` : undefined,
			pipelineUrl: env.CI_PIPELINE_URL,
			vpatUrl: blob("docs/DCB_Admin_for_Libraries_VPAT.md"),
			when: new Date(),
		},
	};
	mkdirSync("reports", { recursive: true });
	const out = join("reports", "release-report.html");
	writeFileSync(out, render(inputs));
	// What the next release's report compares itself with
	const { ref, commit, tag } = inputs.pipeline;
	writeFileSync(join("reports", "release-report.json"), `${JSON.stringify({ figures: figures(inputs), pipeline: { ref, commit, tag } }, null, 2)}\n`);
	console.log(`Written to ${out}, with its data beside it.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
