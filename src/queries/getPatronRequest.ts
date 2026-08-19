import { gql } from "graphql-request";

import { capabilitySelection } from "@helpers/capabilityFields";

// A FUNCTION, not a constant - R-19. Part of the selection depends on the deployment's
// dcb-service release, and the flag that decides is read from window.__APP_ENV__, which
// application.tsx assigns only after awaiting inject_env.json. This module is in the
// static import graph and evaluates first, so a constant would read every flag as off in
// every environment.
export const getPatronRequest = () => gql`
	query LoadPatronRequest($query: String!) {
		patronRequests(query: $query) {
			content {
				id
				dateUpdated
				patronHostlmsCode
				bibClusterId
				pickupLocationCode
				pickupPatronId
				pickupItemId
				pickupItemType
				pickupItemStatus
				pickupRequestId
				pickupRequestStatus
				status
				localRequestId
				localRequestStatus
				localItemId
				localItemStatus
				localItemType
				isExpeditedCheckout
				localBibId
				rawLocalItemStatus
				rawLocalRequestStatus
				description
				nextScheduledPoll
				errorMessage
				previousStatus
				pollCountForCurrentStatus
				currentStatusTimestamp
				nextExpectedStatus
				outOfSequenceFlag
				elapsedTimeInCurrentStatus
				localItemHostlmsCode
				localItemAgencyCode
				isManuallySelectedItem
				resolutionCount
				renewalCount
				renewalStatus
				localRenewalCount
				patron {
					id
				}
				requestingIdentity {
					id
					localId
					homeIdentity
					localBarcode
					localNames
					localPtype
					canonicalPtype
					localHomeLibraryCode
					lastValidated
					# The borrowing library, and the only place a request records it:
					# patronHostlmsCode names the system, which on a shared one is every
					# co-tenant rather than any of them.
					#
					# New in dcb-service 9.0.0. There is no older equivalent to fall back
					# to, and this query drives the patron request detail page, so an
					# older deployment must select none of it rather than fail the page.
					${capabilitySelection("agency_scoped_requests", "PatronIdentity")}
				}
				audit {
					id
					auditDate
					briefDescription
					fromStatus
					toStatus
					auditData
				}
				clusterRecord {
					id
					title
					selectedBib
					isDeleted
					dateCreated
					dateUpdated
					members {
						id
						dateCreated
						dateUpdated
						title
						author
						placeOfPublication
						publisher
						dateOfPublication
						edition
						isLargePrint
						clusterReason
						typeOfRecord
						canonicalMetadata
						metadataScore
						processVersion
						sourceSystemId
						sourceRecordId
						sourceRecord {
							id
							hostLmsId
							remoteId
							lastFetched
							lastProcessed
							processingState
							processingInformation
							sourceRecordData
						}
					}
				}
				dateCreated
				activeWorkflow
				requesterNote
				suppliers {
					id
					canonicalItemType
					dateCreated
					dateUpdated
					hostLmsCode
					isActive
					localItemId
					localBibId
					localItemBarcode
					localItemLocationCode
					localItemStatus
					localItemType
					localId
					localRenewalCount
					localStatus
					localAgency
					rawLocalItemStatus
					rawLocalStatus
					virtualPatron {
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
		}
	}
`;
