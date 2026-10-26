import { gql } from "graphql-request";

// Sent only behind isRequestNotesEnabled.

export const addPatronRequestNote = gql`
	mutation AddPatronRequestNote($patronRequestId: ID!, $body: String!, $agencyCode: String) {
		addPatronRequestNote(patronRequestId: $patronRequestId, body: $body, agencyCode: $agencyCode) {
			id
		}
	}
`;

export const retractPatronRequestNote = gql`
	mutation RetractPatronRequestNote($id: ID!) {
		retractPatronRequestNote(id: $id) {
			id
			retracted
		}
	}
`;
