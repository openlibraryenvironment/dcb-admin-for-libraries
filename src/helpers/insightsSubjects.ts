import { isInsightsSectionShown } from "@helpers/featureFlags";

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

/** The subjects with a panel the deployment shows (VITE_INSIGHTS_PANELS). */
export const visibleSubjects = (): Subject[] => SUBJECTS.filter(isInsightsSectionShown);

/**
 * A subject this app does not offer or the deployment does not show - an old link, a link
 * copied from DCB Admin - falls back rather than rendering nothing. Scope never narrows the
 * list here: the library is fixed by the token.
 */
export const resolveSubject = (requested: Subject | undefined): Subject => {
	const visible = visibleSubjects();
	if (requested && visible.includes(requested)) return requested;
	return visible.includes(DEFAULT_SUBJECT) ? DEFAULT_SUBJECT : (visible[0] ?? DEFAULT_SUBJECT);
};
