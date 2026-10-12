/**
 * The six subjects, and which panels belong to each - the same six as DCB Admin.
 *
 * The order is the reading order: what is happening, how well it went, what was asked for,
 * who with, what we hold, what we are missing.
 */

export const SUBJECTS = [
	"trends",
	"service",
	"demand",
	"partners",
	"collection",
	"gaps",
] as const;

export type Subject = (typeof SUBJECTS)[number];

export const DEFAULT_SUBJECT: Subject = "trends";

/**
 * A subject this app does not offer - an old link, a link copied from DCB Admin - falls
 * back rather than rendering nothing. Scope never narrows the list here: the library is
 * fixed by the token, so every subject that exists can always be shown.
 */
export const resolveSubject = (requested: Subject | undefined): Subject =>
	requested && SUBJECTS.includes(requested) ? requested : DEFAULT_SUBJECT;
