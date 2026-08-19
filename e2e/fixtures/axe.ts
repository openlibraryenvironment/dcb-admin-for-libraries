import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import type { Result } from "axe-core";

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

export async function analyse(page: Page): Promise<Result[]> {
	let builder = new AxeBuilder({ page }).withTags(WCAG_TAGS);
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
						`      - ${node.target.join(" ")}\n        ${node.failureSummary?.replace(/\n/g, "\n        ")}`,
				)
				.join("\n");
			return `  [${violation.impact ?? "unknown"}] ${violation.id}: ${violation.help}\n    ${violation.helpUrl}\n${nodes}`;
		})
		.join("\n\n");
}
