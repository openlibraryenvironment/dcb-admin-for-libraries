import { gql } from "graphql-request";
import { capabilitySelection } from "@helpers/capabilityFields";

// The only document that selects a Host LMS clientConfig, which carries the ILS API
// keys, secrets and staff passwords. /service is the only page that shows them. A function:
// whether it asks for each system's last connection check depends on the deployment.
export const getLibraryServiceConfig = () => gql`
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
						${capabilitySelection("host_lms_last_ping", "HostLms")}
					}
				}
				secondHostLms {
					id
					code
					name
					lmsClientClass
					clientConfig
					${capabilitySelection("host_lms_last_ping", "HostLms")}
				}
			}
		}
	}
`;
