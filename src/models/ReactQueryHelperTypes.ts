// These types help react-query and typescript understand the data coming from GraphQL

import { Library } from "./Library";
import { Location } from "./Location";
import { ReferenceValueMapping } from "./ReferenceValueMapping";
import { PatronIdentity } from "./PatronIdentity";
import { PatronRequest } from "./PatronRequest";

// Helper types for our GraphQL responses - previously this was taken care of by Apollo
// Bridges the gap between react-query, typescript and GraphQL.
export interface PatronRequestQueryData {
	patronRequests?: {
		content: PatronRequest[];
	};
}
export interface PatronIdentitiesQueryData {
	patronIdentities?: {
		content: PatronIdentity[];
	};
}

export interface LibrariesQueryData {
	libraries: {
		content: Library[];
	};
}

export interface LocationsQueryData {
	locations: {
		content: Location[];
	};
}

export interface ReferenceValueMappingsQueryData {
	referenceValueMappings: {
		content: ReferenceValueMapping[];
	};
}
