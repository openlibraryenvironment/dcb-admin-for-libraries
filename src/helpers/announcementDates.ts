/** A fortnight. Long enough for an outage, short enough to be noticed when it lapses. */
export const DEFAULT_ANNOUNCEMENT_DAYS = 14;

const pad = (value: number) => String(value).padStart(2, "0");

/**
 * `yyyy-mm-dd` for the LOCAL calendar day, which is what a native date input reads
 * and writes. toISOString() gives the UTC day, which west of Greenwich is tomorrow
 * every evening.
 */
export const toDateInputValue = (when: Date): string =>
	`${when.getFullYear()}-${pad(when.getMonth() + 1)}-${pad(when.getDate())}`;

export const defaultExpiry = (now: Date = new Date()): string => {
	const when = new Date(now);
	when.setDate(when.getDate() + DEFAULT_ANNOUNCEMENT_DAYS);
	return toDateInputValue(when);
};

/**
 * The end of the chosen day on the administrator's own clock, as an instant.
 * Why the end and not midnight: docs/announcements.md.
 */
export const endOfDay = (date: string): string => {
	const [year, month, day] = date.split("-").map(Number);
	return new Date(year, month - 1, day, 23, 59, 59).toISOString();
};
