/**
 * MARC language codes offered in the advanced search filter, in the order they
 * are shown. Codes only: the display names are translated at the point of use
 * (see AdvancedSearchFilter), because a label baked in here cannot follow the
 * user's language.
 */
export const LANGUAGE_CODES = [
	"eng",
	"spa",
	"ger",
	"fre",
	"ita",
	"chi",
	"jpn",
	"ara",
	"por",
	"lat",
] as const;

export type LanguageCode = (typeof LANGUAGE_CODES)[number];
