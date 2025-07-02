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
		totalSize: number;
	};
}
export interface PatronIdentitiesQueryData {
	patronIdentities?: {
		content: PatronIdentity[];
		totalSize: number;
	};
}

export interface LibrariesQueryData {
	libraries: {
		content: Library[];
		totalSize: number;
	};
}

export interface LocationsQueryData {
	locations: {
		content: Location[];
		totalSize: number;
	};
}

export interface ReferenceValueMappingsQueryData {
	referenceValueMappings: {
		content: ReferenceValueMapping[];
		totalSize: number;
	};
}
