/** dcb-service's own limit on a note's text. */
export const MAX_NOTE_LENGTH = 2000;

export interface RequestNote {
	id: string;
	/** LIBRARY or CONSORTIUM; agencyCode and libraryName are null for the consortium. */
	authorKind: string;
	agencyCode: string | null;
	libraryName: string | null;
	body: string | null;
	dateCreated: string | null;
	retracted: boolean;
	/** LIBRARY or CONSORTIUM: who removed it. */
	retractedBy: string | null;
}

/** A library can remove what it wrote, once; the consortium's notes are the consortium's. */
export const retractableBy = (note: RequestNote, authorable: readonly string[]): boolean =>
	note.authorKind === "LIBRARY" &&
	!note.retracted &&
	!!note.agencyCode &&
	authorable.includes(note.agencyCode);

/** Why a draft cannot be sent yet, as a translation key, or null when it can. */
export const noteProblem = (body: string): string | null => {
	const text = body.trim();
	if (text.length === 0) return "patron_request.notes.empty";
	if (text.length > MAX_NOTE_LENGTH) return "patron_request.notes.too_long";
	return null;
};
