import { gql } from "graphql-request";

import { capabilitySelection } from "@helpers/capabilityFields";

// A builder, because resolvedAgency exists only from dcb-service 9.0.0 and the flag that
// says so arrives after this module evaluates. isBorrowedByCaller reads it.
export const getPatronRequests = () => gql`
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
				nextScheduledPoll
				outOfSequenceFlag
				elapsedTimeInCurrentStatus
				pollCountForCurrentStatus
				isManuallySelectedItem
				requesterNote
				activeWorkflow
				rawLocalRequestStatus
				rawLocalItemStatus
				localRequestId
				localRequestStatus
				localItemId
				localItemStatus
				localItemType
				pickupRequestId
				pickupRequestStatus
				isExpeditedCheckout
				renewalCount
				patron {
					id
				}
				requestingIdentity {
					id
					localId
					localBarcode
					canonicalPtype
					${capabilitySelection("agency_scoped_requests", "PatronIdentity")}
				}
				suppliers {
					localAgency
					canonicalItemType
					localItemBarcode
				}
				clusterRecord {
					id
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
