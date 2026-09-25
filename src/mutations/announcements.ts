import { gql } from "graphql-request";

/**
 * Publishing, correcting and withdrawing an announcement.
 *
 * Functions rather than constants, and only ever called behind `isAnnouncementsEnabled`:
 * an operation dcb-service does not declare fails the whole document, not just its own
 * field. Why the update input carries no scope: docs/announcements.md.
 */
export const createAnnouncement = () => gql`
	mutation CreateAnnouncement($input: CreateAnnouncementInput!) {
		createAnnouncement(input: $input) {
			id
			headline
			expiresAt
		}
	}
`;

export const updateAnnouncement = () => gql`
	mutation UpdateAnnouncement($input: UpdateAnnouncementInput!) {
		updateAnnouncement(input: $input) {
			id
			headline
			expiresAt
		}
	}
`;

export const deleteAnnouncement = () => gql`
	mutation DeleteAnnouncement($input: DeleteEntityInput!) {
		deleteAnnouncement(input: $input) {
			success
			message
		}
	}
`;
