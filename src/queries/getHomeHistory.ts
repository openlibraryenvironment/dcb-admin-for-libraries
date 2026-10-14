import { gql } from "graphql-request";

// Every request a library has borrowed and supplied, as the two grids scope them.
export const getHomeHistory = gql`
	query LoadHomeHistory(
		$borrowed: String!,
		$supplied: String!
	) {
		borrowed: patronRequests(query: $borrowed, pageno: 0, pagesize: 1) {
			totalSize
		}
		supplied: patronRequests(query: $supplied, pageno: 0, pagesize: 1) {
			totalSize
		}
	}
`;
