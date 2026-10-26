export interface AppliedTag {
	code: string;
	label: string;
	/** The libraries that applied it, by agency code. */
	agencyCodes: string[];
	consortium: boolean;
}

export interface VocabularyTag {
	code: string;
	label: string;
	description?: string | null;
	active: boolean;
}

/** What a library can still apply: the active tags it has not applied already. */
export const addableTags = (
	vocabulary: readonly VocabularyTag[],
	applied: readonly AppliedTag[],
	agencyCode: string,
): VocabularyTag[] =>
	vocabulary.filter(
		(tag) =>
			tag.active &&
			!applied.some((done) => done.code === tag.code && done.agencyCodes.includes(agencyCode)),
	);

/** Which of the user's libraries applied this tag, and so can remove it. */
export const removableBy = (tag: AppliedTag, taggable: readonly string[]): string[] =>
	tag.agencyCodes.filter((code) => taggable.includes(code));
