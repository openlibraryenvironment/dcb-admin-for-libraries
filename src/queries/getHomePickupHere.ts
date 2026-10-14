import { gql } from "graphql-request";

// Requests collected at a library's locations for other libraries' patrons.
export const getHomePickupHere = gql`
	query LoadHomePickupHere(
		$ready: String!,
		$arriving: String!
	) {
		ready: patronRequests(query: $ready, pageno: 0, pagesize: 1) {
			totalSize
		}
		arriving: patronRequests(query: $arriving, pageno: 0, pagesize: 1) {
			totalSize
		}
	}
`;
