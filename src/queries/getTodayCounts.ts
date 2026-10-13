import { gql } from "graphql-request";

// One request for every count on the Today page; aliases and variables are the TodayCountId values.
export const getTodayCounts = gql`
	query LoadTodayCounts(
		$readyForPickup: String!,
		$inTransitToPickup: String!,
		$toSupply: String!,
		$returning: String!,
		$failedBorrowed: String!,
		$failedSupplied: String!,
		$unfilled: String!,
		$placed: String!,
		$received: String!
	) {
		readyForPickup: patronRequests(query: $readyForPickup, pageno: 0, pagesize: 1) {
			totalSize
		}
		inTransitToPickup: patronRequests(query: $inTransitToPickup, pageno: 0, pagesize: 1) {
			totalSize
		}
		toSupply: patronRequests(query: $toSupply, pageno: 0, pagesize: 1) {
			totalSize
		}
		returning: patronRequests(query: $returning, pageno: 0, pagesize: 1) {
			totalSize
		}
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
