import { gql } from "graphql-request";

/**
 * Publishing, correcting and withdrawing an announcement — V-12.
 *
 * Functions rather than constants, and only ever called behind `isAnnouncementsEnabled`:
 * dcb-service declares none of these before the `feat/discovery-contract` branch merges, and an undeclared
 * mutation fails the whole operation rather than returning null.
 *
 * There is no scope on the update input, and that is dcb-service's decision rather than an
 * omission here: moving a library's notice to consortium scope by editing it would widen
 * its reach to every patron of every member library through a path that never asks the
 * question the create path asks.
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
