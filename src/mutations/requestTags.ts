import { gql } from "graphql-request";

// Sent only behind isRequestTagsEnabled. Each answers with the request's tags as they now stand.

export const tagPatronRequest = gql`
	mutation TagPatronRequest($patronRequestId: ID!, $tagCode: String!, $agencyCode: String) {
		tagPatronRequest(patronRequestId: $patronRequestId, tagCode: $tagCode, agencyCode: $agencyCode) {
			code
			label
			agencyCodes
			consortium
		}
	}
`;

export const untagPatronRequest = gql`
	mutation UntagPatronRequest($patronRequestId: ID!, $tagCode: String!, $agencyCode: String) {
		untagPatronRequest(patronRequestId: $patronRequestId, tagCode: $tagCode, agencyCode: $agencyCode) {
			code
			label
			agencyCodes
			consortium
		}
	}
`;
