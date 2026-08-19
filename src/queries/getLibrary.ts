import { gql } from "graphql-request";
// Library
// This query fetches all information about a Library from DCB.
// The main place this is used is the individual library page.
export const getLibrary = gql`
	query LoadLibrary($query: String!) {
		libraries(query: $query) {
			content {
				id
				fullName
				shortName
				abbreviatedName
				agencyCode
				supportHours
				address
				latitude
				longitude
				training
				patronWebsite
				discoverySystem
				# Patron-facing brand (N-1B), rendered by the discovery app. patronWebsite
				# above is the mark's link target, so there is no second URL here.
				brandLogoUrl
				brandLogoAlt
				defaultThemeName
				type
				backupDowntimeSchedule
				hostLmsConfiguration
				agency {
					id
					code
					name
					authProfile
					isSupplyingAgency
					isBorrowingAgency
					hostLms {
						id
						code
						name
						clientConfig
						lmsClientClass
						itemSuppressionRulesetName
						suppressionRulesetName
					}
				}
				secondHostLms {
					id
					code
					name
					clientConfig
					lmsClientClass
					itemSuppressionRulesetName
					suppressionRulesetName
				}
				membership {
					libraryGroup {
						id
						code
						name
						type
						consortium {
							id
							name
							functionalSettings {
								id
								name
								enabled
							}
						}
					}
				}
				contacts {
					id
					firstName
					lastName
					role {
						id
						name
						description
						displayName
						keycloakRole
					}
					isPrimaryContact
					email
				}
			}
		}
	}
`;
