import { create } from "zustand";
import { persist } from "zustand/middleware";

import { storageKey } from "@helpers/appBase";
import {
	DEFAULT_DISPLAY,
	DENSITIES,
	isDisplayValue,
	CLOCKS,
	MOTIONS,
	TEXT_SIZES,
	type Clock,
	type Density,
	type Motion,
	type TextSize,
} from "@/themes/display";
import { DEFAULT_FONT, isFontName, type FontName } from "@/themes/fonts";

/** The colour schemes this application declares. */
export const THEME_MODES = ["light", "dark", "highContrast"] as const;
export type ThemeMode = (typeof THEME_MODES)[number];

interface ThemePreferences {
	/**
	 * NULL MEANS "FOLLOW MY DEVICE", and it is the default. `useResolvedMode` is
	 * the only place that resolves it, so nothing else has to know that an unset
	 * mode is not a broken one.
	 */
	mode: ThemeMode | null;
	/** Scales the whole type scale through the root font size. */
	textSize: TextSize;
	/** MUI's spacing unit: how tight every gap in the interface is. */
	density: Density;
	/**
	 * The reading typeface. PER USER, never per library: it is a comfort and
	 * accessibility preference belonging to whoever is looking at the screen,
	 * and a library-wide override would impose one colleague's choice on
	 * another who needs a different one.
	 */
	fontName: FontName;
	/** Whether to animate. `system` defers to prefers-reduced-motion. */
	motion: Motion;
	/**
	 * Which clock a recorded time is shown on. Every timestamp was already on
	 * the reader's, unlabelled; this makes the choice visible and the answer
	 * say which it is. docs/formatting.md.
	 */
	clock: Clock;
}

interface ThemeActions {
	setMode: (mode: ThemeMode | null) => void;
	setTextSize: (textSize: TextSize) => void;
	setDensity: (density: Density) => void;
	setFontName: (fontName: FontName) => void;
	setMotion: (motion: Motion) => void;
	setClock: (clock: Clock) => void;
	/** Returns every display preference to its default. */
	resetDisplay: () => void;
}

const isThemeMode = (value: unknown): value is ThemeMode =>
	typeof value === "string" && (THEME_MODES as readonly string[]).includes(value);

export const useThemeStore = create<ThemePreferences & ThemeActions>()(
	persist(
		(set) => ({
			mode: null,
			...DEFAULT_DISPLAY,

			// Validated on the way in as well as on rehydrate. `null` is a legitimate
			// value here - "follow my device" - so an unrecognised string has to
			// become null rather than be stored and resolved to a scheme that does
			// not exist.
			setMode: (mode) => set({ mode: isThemeMode(mode) ? mode : null }),
			setTextSize: (textSize) =>
				set({
					textSize: isDisplayValue(TEXT_SIZES, textSize)
						? textSize
						: DEFAULT_DISPLAY.textSize,
				}),
			setDensity: (density) =>
				set({
					density: isDisplayValue(DENSITIES, density)
						? density
						: DEFAULT_DISPLAY.density,
				}),
			setFontName: (fontName) =>
				set({ fontName: isFontName(fontName) ? fontName : DEFAULT_FONT }),
			setMotion: (motion) =>
				set({
					motion: isDisplayValue(MOTIONS, motion)
						? motion
						: DEFAULT_DISPLAY.motion,
				}),
			setClock: (clock) =>
				set({
					clock: isDisplayValue(CLOCKS, clock) ? clock : DEFAULT_DISPLAY.clock,
				}),
			// Deliberately does NOT clear `mode`: somebody who wanted their text size
			// back should not also lose the colour scheme they chose.
			resetDisplay: () => set({ ...DEFAULT_DISPLAY }),
		}),
		{
			// Namespaced: sibling apps on this origin share one localStorage.
			name: storageKey("dcb-admin-libraries-theme"),
			/**
			 * Validated on the way OUT of storage, not just in. The setters never run
			 * for a value written by an older build, so this is the only place that
			 * can catch one - and an unknown value must render the default rather
			 * than put `undefined` into a CSS declaration.
			 */
			merge: (persisted, current) => {
				const stored = (persisted ?? {}) as Partial<ThemePreferences>;
				return {
					...current,
					...stored,
					mode: isThemeMode(stored.mode) ? stored.mode : null,
					textSize: isDisplayValue(TEXT_SIZES, stored.textSize)
						? stored.textSize
						: DEFAULT_DISPLAY.textSize,
					density: isDisplayValue(DENSITIES, stored.density)
						? stored.density
						: DEFAULT_DISPLAY.density,
					fontName: isFontName(stored.fontName)
						? stored.fontName
						: DEFAULT_FONT,
					motion: isDisplayValue(MOTIONS, stored.motion)
						? stored.motion
						: DEFAULT_DISPLAY.motion,
					clock: isDisplayValue(CLOCKS, stored.clock)
						? stored.clock
						: DEFAULT_DISPLAY.clock,
				};
			},
		},
	),
);

/**
 * The clock, for code that is not a component. A grid's valueFormatter is a
 * plain function called per cell, so it cannot use the hook - DataGrid.tsx
 * subscribes and remounts on change so this is read fresh.
 */
export const currentClock = (): Clock => useThemeStore.getState().clock;

/** The clock, for components. Atomic, so an unrelated preference does not re-render. */
export const useClock = (): Clock => useThemeStore((state) => state.clock);
