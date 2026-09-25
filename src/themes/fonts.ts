// The typeface registry: a FIXED vocabulary, because a font name reaches a
// CSS declaration. All five are self-hosted. Why, the licences, and what the
// five families actually cost: docs/theming.md §4.

import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
import "@fontsource-variable/inter";
import "@fontsource-variable/lexend";
import "@fontsource-variable/atkinson-hyperlegible-next";

/**
 * The system stack. Costs zero bytes, which is the right answer on a
 * constrained connection and the reason it is on the list at all.
 */
const SYSTEM_STACK =
	'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

export interface FontOption {
	/** Translation key for the family's name as the picker shows it. */
	labelKey: string;
	/** Translation key for the one line saying who it is for. */
	descriptionKey: string;
	/** The value that reaches `typography.fontFamily`. */
	stack: string;
}

export const FONTS = {
	roboto: {
		labelKey: "display.typeface.roboto.name",
		descriptionKey: "display.typeface.roboto.description",
		stack: '"Roboto", "Helvetica", "Arial", sans-serif',
	},
	system: {
		labelKey: "display.typeface.system.name",
		descriptionKey: "display.typeface.system.description",
		stack: SYSTEM_STACK,
	},
	atkinsonHyperlegible: {
		labelKey: "display.typeface.atkinsonHyperlegible.name",
		descriptionKey: "display.typeface.atkinsonHyperlegible.description",
		stack:
			'"Atkinson Hyperlegible Next Variable", "Atkinson Hyperlegible", "Roboto", "Helvetica", "Arial", sans-serif',
	},
	inter: {
		labelKey: "display.typeface.inter.name",
		descriptionKey: "display.typeface.inter.description",
		stack:
			'"Inter Variable", "Inter", "Roboto", "Helvetica", "Arial", sans-serif',
	},
	lexend: {
		labelKey: "display.typeface.lexend.name",
		descriptionKey: "display.typeface.lexend.description",
		stack:
			'"Lexend Variable", "Lexend", "Roboto", "Helvetica", "Arial", sans-serif',
	},
} as const satisfies Record<string, FontOption>;

export type FontName = keyof typeof FONTS;

export const FONT_NAMES = Object.keys(FONTS) as FontName[];

export const DEFAULT_FONT: FontName = "roboto";

export const isFontName = (value: unknown): value is FontName =>
	typeof value === "string" && value in FONTS;

/** The stack for a name, or the default's when the name is not one of ours. */
export const fontStack = (name: FontName): string =>
	(FONTS[name] ?? FONTS[DEFAULT_FONT]).stack;
