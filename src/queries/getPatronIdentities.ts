import { gql } from "graphql-request";

export const getPatronIdentities = gql`
	query LoadPatronIdentities(
		$query: String!
		$pageno: Int!
		$pagesize: Int!
		$order: String!
		$orderBy: String!
	) {
		patronIdentities(
			query: $query
			pageno: $pageno
			pagesize: $pagesize
			order: $order
			orderBy: $orderBy
		) {
			totalSize
			content {
				id
				localId
				homeIdentity
				localBarcode
				localNames
				localPtype
				canonicalPtype
				localHomeLibraryCode
				lastValidated
			}
		}
	}
`;
