import { storageKey } from "@helpers/appBase";

/**
 * When this browser last opened Today, and when the visit before that one began. Per
 * browser by design - a convenience, not a record - so a shared desk PC shares it.
 */
export interface Visits {
	lastSeen: string;
	previous: string | null;
}

// Reopening Today within half an hour is the same visit, so "since your last visit" holds still
const SAME_VISIT_MS = 30 * 60_000;

// Past this, "since your last visit" is the last 30 days: the window bounds what is counted
export const MAX_LOOKBACK_DAYS = 30;

export const nextVisits = (stored: Visits | null, now: Date): Visits => {
	if (!stored) return { lastSeen: now.toISOString(), previous: null };
	const gap = now.getTime() - Date.parse(stored.lastSeen);
	return {
		lastSeen: now.toISOString(),
		previous: gap > SAME_VISIT_MS ? stored.lastSeen : stored.previous,
	};
};

/** The window's start for "since your last visit", or null when no earlier visit is known. */
export const sinceLastVisit = (visits: Visits, now: Date): string | null => {
	if (!visits.previous) return null;
	const floor = now.getTime() - MAX_LOOKBACK_DAYS * 24 * 3_600_000;
	return new Date(Math.max(Date.parse(visits.previous), floor)).toISOString();
};

const KEY = () => storageKey("todayVisits");

const isIso = (value: unknown): value is string =>
	typeof value === "string" && value.length <= 40 && !Number.isNaN(Date.parse(value));

export const readVisits = (): Visits | null => {
	try {
		const raw = JSON.parse(localStorage.getItem(KEY()) ?? "null");
		if (!raw || !isIso(raw.lastSeen)) return null;
		return { lastSeen: raw.lastSeen, previous: isIso(raw.previous) ? raw.previous : null };
	} catch {
		return null;
	}
};

export const writeVisits = (visits: Visits): void => {
	try {
		localStorage.setItem(KEY(), JSON.stringify(visits));
	} catch {
		// Private windows and blocked storage: the option is then offered as unavailable
	}
};
