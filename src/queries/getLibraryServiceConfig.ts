import { gql } from "graphql-request";

// The only document that selects a Host LMS clientConfig, which carries the ILS API
// keys, secrets and staff passwords. /service is the only page that shows them.
export const getLibraryServiceConfig = gql`
	query LoadLibraryServiceConfig($query: String!) {
		libraries(query: $query) {
			content {
				id
				discoverySystem
				patronWebsite
				hostLmsConfiguration
				agency {
					id
					code
					authProfile
					hostLms {
						id
						code
						name
						lmsClientClass
						clientConfig
					}
				}
				secondHostLms {
					id
					code
					name
					lmsClientClass
					clientConfig
				}
			}
		}
	}
`;
