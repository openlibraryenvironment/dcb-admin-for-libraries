import { gql } from "graphql-request";

// Today's windowed counts a week earlier; aliases and variables are the TodayCountId values.
export const getTodayLastWeek = gql`
	query LoadTodayLastWeek(
		$failedBorrowed: String!,
		$failedSupplied: String!,
		$unfilled: String!,
		$placed: String!,
		$received: String!
	) {
		failedBorrowed: patronRequests(query: $failedBorrowed, pageno: 0, pagesize: 1) {
			totalSize
		}
		failedSupplied: patronRequests(query: $failedSupplied, pageno: 0, pagesize: 1) {
			totalSize
		}
		unfilled: patronRequests(query: $unfilled, pageno: 0, pagesize: 1) {
			totalSize
		}
		placed: patronRequests(query: $placed, pageno: 0, pagesize: 1) {
			totalSize
		}
		received: patronRequests(query: $received, pageno: 0, pagesize: 1) {
			totalSize
		}
	}
`;
