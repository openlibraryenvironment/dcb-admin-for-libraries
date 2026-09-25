export enum SearchField {
	Keyword = "keyword",
	Title = "title",
	Author = "author",
	ISSN = "issn",
	ISBN = "isbn",
	Subject = "subject",
	Language = "language",
	Publisher = "publisher",
	Format = "format",
	PublicationYear = "publicationYear",
	Library = "library",
	ClusterRecordID = "clusterRecordId",
}

export enum BooleanOperator {
	AND = "AND",
	OR = "OR",
	NOT = "NOT",
}

export interface SearchFilter {
	id: string;
	field: SearchField;
	value: string;
	operator?: BooleanOperator;
}

export interface FilterState {
	filters: SearchFilter[];
}

/**
 * One instance as the shared index returns it.
 *
 * Loosely typed on purpose: the index serves whatever the source records carry,
 * and every field below is absent for some record somewhere.
 */
export interface SearchInstance {
	id: string;
	title?: string;
	description?: string;
	publicationDate?: string;
	sourceTypes?: string[];
	contributors?: { name: string }[];
	publication?: { publisher: string; dateOfPublication: string }[];
	isbns?: string[];
	issns?: string[];
}
