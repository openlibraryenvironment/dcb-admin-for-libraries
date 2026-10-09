import { gql } from "graphql-request";

// Names only, for the header and the library selector, which render on every
// page for every role. LoadLibrary and LoadLibraries select the Host LMS
// clientConfig, which carries ILS credentials.
export const getLibraryNames = gql`
	query LoadLibraryNames(
		$query: String!
		$pageno: Int
		$pagesize: Int
		$order: String
		$orderBy: String
	) {
		libraries(
			query: $query
			pageno: $pageno
			pagesize: $pagesize
			order: $order
			orderBy: $orderBy
		) {
			content {
				id
				fullName
				agencyCode
			}
		}
	}
`;
