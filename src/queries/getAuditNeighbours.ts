import { gql } from "graphql-request";

export const getAuditNeighbours = gql`
	query GetAuditNeighbours($older: String!, $newer: String!) {
		older: audits(
			query: $older
			pageno: 0
			pagesize: 1
			order: "auditDate"
			orderBy: "DESC"
		) {
			content {
				id
				briefDescription
			}
		}
		newer: audits(
			query: $newer
			pageno: 0
			pagesize: 1
			order: "auditDate"
			orderBy: "ASC"
		) {
			content {
				id
				briefDescription
			}
		}
	}
`;
