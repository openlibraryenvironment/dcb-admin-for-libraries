import { gql } from "graphql-request";

/**
 * A page of one request's notes, newest first, and the libraries party to it, which decide who
 * may write one. Sent only behind `isRequestNotesEnabled`: dcb-service before 9.2.0 declares
 * neither field. dcb-service serves at most 50 a page. docs/request-notes.md.
 */
export const getPatronRequestNotes = gql`
	query LoadPatronRequestNotes($query: String!, $pageno: Int, $pagesize: Int) {
		patronRequests(query: $query, pageno: 0, pagesize: 1) {
			content {
				id
				involvedAgencyCodes
				notes(pageno: $pageno, pagesize: $pagesize) {
					content {
						id
						authorKind
						agencyCode
						libraryName
						body
						dateCreated
						retracted
						retractedBy
					}
					totalSize
				}
			}
		}
	}
`;
