import { gql } from "graphql-request";

// The request grids' library filter: names and codes only. getLibraries nests the
// agency, Host LMS, membership and consortium, each a separate read per library on
// dcb-service, for fields no grid shows.
export const getLibraryFilterOptions = gql`
	query LoadLibraryFilterOptions(
		$pageno: Int!
		$pagesize: Int!
		$order: String!
		$query: String!
		$orderBy: String!
	) {
		libraries(
			pageno: $pageno
			pagesize: $pagesize
			order: $order
			query: $query
			orderBy: $orderBy
		) {
			content {
				id
				fullName
				agencyCode
				agency {
					id
					code
					hostLms {
						id
						code
					}
				}
			}
			totalSize
		}
	}
`;
