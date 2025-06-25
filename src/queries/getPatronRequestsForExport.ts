// A query for getting all info needed for the export of patron requests data

import { gql } from "graphql-request";

export const getPatronRequestsForExport = gql`
	query LoadPatronRequests(
		$pageno: Int!
		$pagesize: Int!
		$order: String!
		$query: String!
		$orderBy: String!
	) {
		patronRequests(
			pageno: $pageno
			pagesize: $pagesize
			order: $order
			query: $query
			orderBy: $orderBy
		) {
			content {
				id
				dateCreated
				dateUpdated
				patronHostlmsCode
				pickupLocationCode
				description
				status
				previousStatus
				nextExpectedStatus
				errorMessage
				outOfSequenceFlag
				elapsedTimeInCurrentStatus
				pollCountForCurrentStatus
				isManuallySelectedItem
				requesterNote
				activeWorkflow
				pickupRequestId
				pickupRequestStatus
				pickupItemId
				patron {
					id
				}
				requestingIdentity {
					localBarcode
					canonicalPtype
				}
				suppliers {
					localAgency
					canonicalItemType
				}
				clusterRecord {
					title
				}
			}
			pageable {
				number
				offset
			}
			totalSize
		}
	}
`;
