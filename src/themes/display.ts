// The display preference vocabularies and the arithmetic that turns them into
// theme values. Kept out of any store so both are testable without a React tree.

import { DEFAULT_FONT, type FontName } from "./fonts";

export const TEXT_SIZES = ["small", "normal", "large", "largest"] as const;
export const DENSITIES = ["comfortable", "compact"] as const;
export const MOTIONS = ["system", "full", "reduced"] as const;
/**
 * Which clock a recorded time is shown on. dcb-service records in UTC, so
 * "service" is UTC - not a consortium timezone, which nothing exposes.
 * docs/formatting.md.
 */
export const CLOCKS = ["device", "service"] as const;

export type TextSize = (typeof TEXT_SIZES)[number];
export type Density = (typeof DENSITIES)[number];
export type Motion = (typeof MOTIONS)[number];
export type Clock = (typeof CLOCKS)[number];

/**
 * The preferences that reach the THEME.
 *
 * `motion` is absent on purpose: it is an attribute on the root element that
 * static CSS answers, not a theme value - so including it would add an axis to
 * the build's cache key for something the built theme does not depend on.
 */
export interface ThemeDisplay {
	textSize: TextSize;
	density: Density;
	fontName: FontName;
}

/** Everything a user can choose about how the interface is drawn. */
export interface DisplayPreferences extends ThemeDisplay {
	motion: Motion;
	clock: Clock;
}

/**
 * What a user gets before choosing anything, and what "reset" returns them to.
 *
 * Every value reproduces today's appearance exactly, so introducing the seam
 * moves nobody's interface until they ask it to: `normal` is a 100% root size
 * and `comfortable` is MUI's own 8px spacing unit.
 */
export const DEFAULT_DISPLAY: DisplayPreferences = {
	textSize: "normal",
	density: "comfortable",
	fontName: DEFAULT_FONT,
	// Defers to prefers-reduced-motion, which is the honest default: a device
	// already configured for someone is a better answer than ours.
	motion: "system",
	// The reader's own clock, which is what every timestamp already showed -
	// only now it says so.
	clock: "device",
};

/**
 * Text size scales the ROOT element, not `typography.fontSize`.
 *
 * The rule that follows for components: a px font size opts that element out,
 * silently. Icons are the exception and stay in px.
 */
const TEXT_SIZE_ROOT: Record<TextSize, string> = {
	small: "93.75%", // 15px
	normal: "100%", // 16px - the browser default, and today's appearance
	large: "106.25%", // 17px
	largest: "112.5%", // 18px
};

/**
 * MUI's spacing unit, and the reason the theme is BUILT rather than overlaid:
 * `theme.spacing` is a function, and merging a number over it makes every
 * `sx={{ p: 2 }}` throw.
 */
const DENSITY_SPACING: Record<Density, number> = {
	comfortable: 8,
	compact: 6,
};

export const rootFontSize = (textSize: TextSize): string =>
	TEXT_SIZE_ROOT[textSize] ?? TEXT_SIZE_ROOT[DEFAULT_DISPLAY.textSize];

export const spacingUnit = (density: Density): number =>
	DENSITY_SPACING[density] ?? DENSITY_SPACING[DEFAULT_DISPLAY.density];

/**
 * Whether a stored value is still one this build knows about.
 *
 * Tolerated on read, not just on write: a preference written by a later release,
 * or edited in localStorage, arrives from storage rather than from code and must
 * render the default rather than put `undefined` into a CSS declaration.
 */
export function isDisplayValue<T extends readonly string[]>(
	allowed: T,
	value: unknown,
): value is T[number] {
	return (
		typeof value === "string" && (allowed as readonly string[]).includes(value)
	);
}

/**
 * The `data-motion` value for `<html>`, or null when the user defers to the OS -
 * in which case the media query answers it alone.
 */
export const motionAttribute = (motion: Motion): string | null =>
	motion === "system" ? null : motion;
