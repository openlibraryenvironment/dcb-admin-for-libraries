import { gql } from "graphql-request";

import { capabilitySelection } from "@helpers/capabilityFields";

/**
 * A FUNCTION, not a constant — see getLibrary for why the flag cannot be read at module
 * scope.
 *
 * The selection set is only half of it. UpdateLibraryInput does not declare the brand
 * keys before dcb-service 9.0.0, and an undeclared INPUT field fails the mutation exactly
 * as an undeclared output field does - so the caller passes its variables through
 * stripUnsupportedInput. Without that, nothing on the library form saves: not the name,
 * not the support hours, not the coordinates.
 */
export const updateLibrary = () => gql`
	mutation UpdateLibrary($input: UpdateLibraryInput!) {
		updateLibrary(input: $input) {
			id
			backupDowntimeSchedule
			supportHours
			latitude
			longitude
			${capabilitySelection("library_branding", "Library")}
		}
	}
`;
