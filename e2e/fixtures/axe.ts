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
 * Rules whose "incomplete" is undecidable rather than a hidden defect.
 *
 * color-contrast cannot resolve a ground behind MUI's elevation gradient, so
 * asserting it would fire on every Paper. Those pairs are measured instead by
 * themeContrast.test.ts, which does not depend on what a browser can sample.
 */
const UNDECIDABLE = new Set(["color-contrast"]);

export interface AxeFindings {
	violations: Result[];
	/**
	 * Checks axe could not decide, which it reports SEPARATELY from violations.
	 * A dangling aria-labelledby lands here, which is how five of them survived
	 * a green gate: the assertion read `violations` alone.
	 */
	incomplete: Result[];
}

export async function analyse(page: Page): Promise<AxeFindings> {
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
	const { violations, incomplete } = await builder.analyze();
	return {
		violations,
		incomplete: incomplete.filter((result) => !UNDECIDABLE.has(result.id)),
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
