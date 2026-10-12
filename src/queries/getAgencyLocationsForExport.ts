import { gql } from "graphql-request";

// Through Agency.locations because it is the one path to an agency's locations on every
// supported dcb-service: `locations` cannot be filtered by agency before 9.0.0.
export const getAgencyLocationsForExport = gql`
	query LoadAgencyLocationsForExport(
		$query: String!
		$pageno: Int!
		$pagesize: Int!
	) {
		agencies(query: $query, pageno: $pageno, pagesize: $pagesize) {
			totalSize
			content {
				code
				hostLms {
					code
				}
				locations {
					id
				}
			}
		}
	}
`;
