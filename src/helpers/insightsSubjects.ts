/**
 * The five subjects, and which panels belong to each.
 *
 * The order is the reading order: what is happening, how well it went, what was asked for,
 * who with, what we are missing. Rationale: INSIGHTS_IA_AND_UX_PLAN.md section 1.3.
 *
 * "Collection" is absent, unlike dcb-admin-ui: the collection-analysis endpoints describe
 * the consortium's catalogue rather than one library's traffic, and this app has no panels
 * for them. A subject with nothing in it is worse than one that is not offered.
 */

export const SUBJECTS = [
	"trends",
	"service",
	"demand",
	"partners",
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
