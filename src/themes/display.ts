// The display preference vocabularies and the arithmetic that turns them into
// theme values. Kept out of any store so both are testable without a React tree.

export const TEXT_SIZES = ["small", "normal", "large", "largest"] as const;
export const DENSITIES = ["comfortable", "compact"] as const;

export type TextSize = (typeof TEXT_SIZES)[number];
export type Density = (typeof DENSITIES)[number];

/**
 * The preferences that reach the THEME.
 *
 * Motion and typeface are deliberately absent for now: motion is CSS on the root
 * element rather than a theme property, and a typeface registry is its own
 * change. Both join this type when they arrive, and both then belong in the
 * build's cache key.
 */
export interface ThemeDisplay {
	textSize: TextSize;
	density: Density;
}

/**
 * What a user gets before choosing anything, and what "reset" returns them to.
 *
 * Every value reproduces today's appearance exactly, so introducing the seam
 * moves nobody's interface until they ask it to: `normal` is a 100% root size
 * and `comfortable` is MUI's own 8px spacing unit.
 */
export const DEFAULT_DISPLAY: ThemeDisplay = {
	textSize: "normal",
	density: "comfortable",
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
