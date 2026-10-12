import { gql } from "graphql-request";

import { capabilitySelection } from "@helpers/capabilityFields";

// A builder, because resolvedAgency exists only from dcb-service 9.0.0 and the flag that
// says so arrives after this module evaluates. id, pickupLocationCode, suppliers.localAgency
// and resolvedAgency are what helpers/exportScope reads to keep or drop each row.
export const getPatronRequestsForExport = () => gql`
	query LoadPatronRequestsForExport(
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
				isExpeditedCheckout
				renewalCount
				rawLocalRequestStatus
				rawLocalItemStatus
				localRequestId
				localRequestStatus
				localItemId
				localItemStatus
				localItemType
				patron {
					id
				}
				requestingIdentity {
					localBarcode
					canonicalPtype
					${capabilitySelection("agency_scoped_requests", "PatronIdentity")}
				}
				suppliers {
					localAgency
					canonicalItemType
					localItemBarcode
					localItemType
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
