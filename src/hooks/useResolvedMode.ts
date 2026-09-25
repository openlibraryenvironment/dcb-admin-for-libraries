import { useEffect, useState } from "react";

import { useThemeStore, type ThemeMode } from "@/hooks/useThemeStore";

const DARK_QUERY = "(prefers-color-scheme: dark)";
const CONTRAST_QUERY = "(prefers-contrast: more)";

/** What the operating system is asking for. Contrast outranks colour scheme. */
export function readSystemMode(): ThemeMode {
	if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
		return "light";
	}
	if (window.matchMedia(CONTRAST_QUERY).matches) {
		return "highContrast";
	}
	return window.matchMedia(DARK_QUERY).matches ? "dark" : "light";
}

/**
 * Both queries are SUBSCRIBED rather than sampled: they change while the app is
 * open, and somebody turning high contrast on in the OS should not have to
 * reload to see it.
 */
function useSystemMode(): ThemeMode {
	const [systemMode, setSystemMode] = useState<ThemeMode>(readSystemMode);

	useEffect(() => {
		const queries = [
			window.matchMedia?.(CONTRAST_QUERY),
			window.matchMedia?.(DARK_QUERY),
		].filter((query): query is MediaQueryList => query != null);

		if (queries.length === 0) return;

		const onChange = () => setSystemMode(readSystemMode());
		queries.forEach((query) => query.addEventListener("change", onChange));
		return () =>
			queries.forEach((query) => query.removeEventListener("change", onChange));
	}, []);

	return systemMode;
}

/**
 * The scheme to render in: the user's choice, or the operating system's when
 * they have made none.
 *
 * A user who HAS chosen keeps their choice on a device whose OS says otherwise,
 * which is the direction that matters: the setting on a shared workstation is
 * somebody else's, and this application runs on shared workstations.
 */
export function useResolvedMode(): ThemeMode {
	const chosen = useThemeStore((state) => state.mode);
	// Called unconditionally: `chosen ?? useSystemMode()` would skip the hook
	// whenever the user has chosen, which is a rules-of-hooks violation and a
	// mid-session crash the first time they clear their choice.
	const systemMode = useSystemMode();
	return chosen ?? systemMode;
}
