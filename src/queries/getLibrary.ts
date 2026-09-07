import { gql } from "graphql-request";

import { capabilitySelection } from "@helpers/capabilityFields";

// Library
// This query fetches all information about a Library from DCB.
// The main place this is used is the individual library page.
//
// A FUNCTION, not a constant - R-19. Part of the selection depends on the deployment's
// dcb-service release, and the flag that decides is read from window.__APP_ENV__, which
// application.tsx assigns only after awaiting inject_env.json. This module is in the
// static import graph and evaluates first, so a constant would read every flag as off in
// every environment. Built when the query runs, it reads the truth.
export const getLibrary = () => gql`
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
				#
				# New in dcb-service 9.0.0. Library carried no brand at all before it, so
				# there is nothing to fall back to and an older deployment selects none of
				# these - this query runs on every page and would otherwise fail whole.
				${capabilitySelection("library_branding", "Library")}
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
