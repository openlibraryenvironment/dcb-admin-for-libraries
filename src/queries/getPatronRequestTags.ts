import { gql } from "graphql-request";

/**
 * One request's tags, and the libraries party to it, which decide who may tag it.
 *
 * Its own document, sent only behind `isRequestTagsEnabled`: dcb-service before 9.2.0
 * declares neither field, and an undeclared field fails the whole operation. Not a column
 * on the request lists: dcb-service resolves both fields per request, with an involvement
 * check each time. docs/request-tags.md.
 */
export const getPatronRequestTags = gql`
	query LoadPatronRequestTags($query: String!) {
		patronRequests(query: $query, pageno: 0, pagesize: 1) {
			content {
				id
				tags {
					code
					label
					agencyCodes
					consortium
				}
				involvedAgencyCodes
			}
		}
	}
`;

/** The consortium's list, retired tags included: they still name tags already applied. */
export const getRequestTagVocabulary = gql`
	query LoadRequestTags {
		requestTags {
			code
			label
			description
			active
		}
	}
`;
