import { SearchField } from "@models/SearchTypes";

export const CQL_FIELD_MAPPING = {
	[SearchField.Keyword]: "@keyword all",
	[SearchField.Title]: "title all",
	[SearchField.Author]: "contributors all",
	[SearchField.ISSN]: "issn=",
	[SearchField.ISBN]: "isbn=",
	[SearchField.Subject]: "subjects=",
	[SearchField.Language]: "languages=",
	[SearchField.Format]: "sourceTypes=",
	[SearchField.PublicationYear]: "publicationYear=",
	[SearchField.Publisher]: "instancePublishers=",
	[SearchField.Library]: "items.effectiveLocationId=",
};
