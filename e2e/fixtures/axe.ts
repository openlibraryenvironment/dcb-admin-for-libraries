import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";
import axe, { type Result } from "axe-core";

/**
 * WCAG 2.2 AA is the floor. These are the axe tag sets that map to it - the
 * 2.0, 2.1 and 2.2 A/AA rules. Anything outside them (best-practice,
 * experimental) is not the gate and is not asserted, so the gate cannot drift
 * into failing on opinion.
 */
export const WCAG_TAGS = [
	"wcag2a",
	"wcag2aa",
	"wcag21a",
	"wcag21aa",
	"wcag22aa",
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
 * Rules outside the WCAG tag sets that we assert anyway, each because it caught something
 * real here. Named one at a time rather than by turning on best-practice wholesale, so the
 * gate still cannot fail on opinion.
 *
 * heading-order: the Insights panels rendered as <h6> under an <h1>, skipping four levels,
 * because MUI's h6 variant is an h6 element unless you say otherwise. A screen-reader user
 * navigating by heading met a page whose outline said every panel was nested four deep
 * inside nothing. The WCAG tags do not cover it; this does.
 */
const EXTRA_RULES = ["heading-order"];

/**
 * The tag sets AND the extra rules, as one list of rule ids.
 *
 * NOT `.withTags(...).withRules(...)`. Both of those set `runOnly`, so chaining them does
 * not combine - the second silently REPLACES the first, and this gate spent its life
 * asserting `heading-order` alone while reporting green on the whole WCAG ladder. It was
 * found because Lighthouse failed an aria-hidden-focus rule that is tagged wcag2a and
 * that this scan was therefore not running.
 */
const RULES = [
	...new Set([
		...axe.getRules(WCAG_TAGS).map((rule) => rule.ruleId),
		...EXTRA_RULES,
	]),
];

export async function analyse(page: Page): Promise<Result[]> {
	// Guards the gate: a rule list that has lost the tag sets is exactly what this file
	// looked like before, and it looked green.
	expect(RULES).toContain("color-contrast");
	expect(RULES).toContain("heading-order");
	expect(RULES.length).toBeGreaterThan(50);

	let builder = new AxeBuilder({ page }).withRules(RULES);
	for (const selector of VENDOR_EXCLUSIONS) {
		builder = builder.exclude(selector);
	}
	const { violations } = await builder.analyze();
	return violations;
}

/**
 * axe's raw output is unreadable in a CI log. This prints one block per
 * violation with the rule, its impact, the help URL and the offending DOM
 * nodes, so a failure is actionable from the log alone.
 */
export function formatViolations(violations: Result[]): string {
	return violations
		.map((violation) => {
			const nodes = violation.nodes
				.map(
					(node) =>
						// The markup as well as the selector: a React `useId` selector like
						// "#_r_8_" names nothing a reader can search the source for, and a
						// log that cannot be acted on sends somebody back to reproduce it.
						`      - ${node.target.join(" ")}\n        ${node.html}\n        ${node.failureSummary?.replace(/\n/g, "\n        ")}`,
				)
				.join("\n");
			return `  [${violation.impact ?? "unknown"}] ${violation.id}: ${violation.help}\n    ${violation.helpUrl}\n${nodes}`;
		})
		.join("\n\n");
}
