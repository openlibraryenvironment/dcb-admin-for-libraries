import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import type { Result } from "axe-core";

/**
 * WCAG 2.2 AA is the floor. These are the axe tag sets that map to it - the
 * 2.0, 2.1 and 2.2 A/AA rules.
 */
export const WCAG_TAGS = [
	"wcag2a",
	"wcag2aa",
	"wcag21a",
	"wcag21aa",
	"wcag22aa",
];

/**
 * Four rules axe files under `best-practice` that this application needs
 * anyway, named one by one rather than by widening the tag set.
 *
 * The tag carries a great deal of opinion; these four carry none. Every page
 * needs a main landmark, one h1, content inside a landmark, and headings that
 * do not skip a level - and their absence is a real 1.3.1 and 2.4.1 failure
 * however axe files it. Nine routes had no h1 and the layout had no landmarks
 * at all while this gate was green, which is what excluding them cost.
 */
export const EXTRA_RULES = [
	"region",
	"landmark-one-main",
	"page-has-heading-one",
	"heading-order",
];

/**
 * MUI X Premium paints a missing-licence watermark over every grid when no key
 * is configured, which is the case in CI (see runtime-config.ts). It is vendor
 * chrome that never reaches production, it is inert (pointer-events: none),
 * and its hardcoded #8282829e fails colour-contrast - so it is excluded rather
 * than allowed to redden a gate that exists to police our own palette.
 *
 * It carries no class, only inline styles, so the z-index it sets is the only
 * stable handle on it. Nothing else in this app uses 100000.
 */
const VENDOR_EXCLUSIONS = ['[style*="z-index: 100000"]'];

/**
 * Rules whose INCOMPLETE result axe cannot decide. Filtered from `incomplete`
 * only - each still fails the gate as a violation - and each has a test that
 * decides it instead: docs/testing.md.
 */
const UNDECIDABLE = new Set(["color-contrast", "aria-hidden-focus"]);

/**
 * axe 4.13 marks every aria-controls on an aria-haspopup element for review, whether or not the
 * popup is there (aria-valid-attr-value's pre-check returns before looking). This decides it: the
 * node is dropped only when the element it controls is in the page.
 */
const decidePopupControls = async (page: Page, results: Result[]): Promise<Result[]> => {
	const decided: Result[] = [];
	for (const result of results) {
		const nodes = [];
		for (const node of result.nodes) {
			const checks = [...node.any, ...node.all, ...node.none];
			const popup = checks.find(
				(check) => (check.data as { messageKey?: string } | null)?.messageKey === "controlsWithinPopup",
			);
			const id = /aria-controls="([^"]*)"/.exec(
				String((popup?.data as { needsReview?: string } | null)?.needsReview ?? ""),
			)?.[1];
			const present =
				id !== undefined &&
				(await page.evaluate((controlled) => document.getElementById(controlled) !== null, id));
			if (!present) nodes.push(node);
		}
		if (nodes.length > 0) decided.push({ ...result, nodes });
	}
	return decided;
};

export interface AxeFindings {
	violations: Result[];
	/**
	 * Checks axe could not decide, which it reports SEPARATELY from violations.
	 * A dangling aria-labelledby lands here, which is how five of them survived
	 * a green gate: the assertion read `violations` alone.
	 */
	incomplete: Result[];
	passes: Result[];
}

/** One axe rule's outcome on a page, as the release report reads it from a test's attachment. */
export interface AxeRuleOutcome {
	id: string;
	help: string;
	outcome: "passed" | "failed" | "undecided";
	criteria: string[];
}

/** The WCAG success criteria an axe rule tests, from its tags: "wcag1410" is 1.4.10. */
export function criteriaOf(result: Pick<Result, "tags">): string[] {
	return result.tags.flatMap((tag) => {
		const match = /^wcag(\d)(\d)(\d+)$/.exec(tag);
		return match ? [`${match[1]}.${match[2]}.${match[3]}`] : [];
	});
}

export function summarise(findings: AxeFindings): AxeRuleOutcome[] {
	const outcome = (results: Result[], label: AxeRuleOutcome["outcome"]) =>
		results.map((result) => ({
			id: result.id,
			help: result.help,
			outcome: label,
			criteria: criteriaOf(result),
		}));
	return [
		...outcome(findings.passes, "passed"),
		...outcome(findings.violations, "failed"),
		...outcome(findings.incomplete, "undecided"),
	];
}

export async function analyse(page: Page): Promise<AxeFindings> {
	// A dialog's fade or a button's transition sampled mid-run reports a colour
	// pair that never rests on screen. Infinite ones (spinners) never finish.
	await page.evaluate(() =>
		Promise.all(
			document
				.getAnimations()
				.filter((a) => a.effect?.getComputedTiming().endTime !== Infinity)
				.map((a) => a.finished.catch(() => undefined)),
		),
	);
	let builder = new AxeBuilder({ page })
		.withTags(WCAG_TAGS)
		// `withRules` REPLACES the tag selection rather than adding to it, so the
		// extra rules are requested through options instead.
		.options({
			rules: Object.fromEntries(
				EXTRA_RULES.map((rule) => [rule, { enabled: true }]),
			),
		});
	for (const selector of VENDOR_EXCLUSIONS) {
		builder = builder.exclude(selector);
	}
	const { violations, incomplete, passes } = await builder.analyze();
	return {
		violations,
		incomplete: await decidePopupControls(
			page,
			incomplete.filter((result) => !UNDECIDABLE.has(result.id)),
		),
		passes,
	};
}

/**
 * axe's raw output is unreadable in a CI log. This prints one block per
 * result with the rule, its impact, the help URL and the offending DOM
 * nodes, so a failure is actionable from the log alone.
 */
export function formatViolations(results: Result[]): string {
	return results
		.map((result) => {
			const nodes = result.nodes
				.map(
					(node) =>
						`      - ${node.target.join(" ")}\n        ${node.failureSummary?.replace(/\n/g, "\n        ")}`,
				)
				.join("\n");
			return `  [${result.impact ?? "unknown"}] ${result.id}: ${result.help}\n    ${result.helpUrl}\n${nodes}`;
		})
		.join("\n\n");
}
