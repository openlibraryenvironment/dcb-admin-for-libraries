import { gql } from "graphql-request";

export const updateLibrary = gql`
	mutation UpdateLibrary($input: UpdateLibraryInput!) {
		updateLibrary(input: $input) {
			id
			backupDowntimeSchedule
			supportHours
			latitude
			longitude
		}
	}
`;
