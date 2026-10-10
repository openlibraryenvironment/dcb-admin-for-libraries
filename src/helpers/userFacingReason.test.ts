import { describe, expect, it } from "vitest";
import { ClientError } from "graphql-request";
import { UserFacingError, userFacingReason } from "@helpers/userFacingReason";

const graphQLError = (message: string) =>
	new ClientError(
		{
			errors: [{ message }] as never,
			status: 200,
			headers: new Headers(),
			body: "",
		},
		{ query: "mutation X { x }" },
	);

describe("userFacingReason", () => {
	it("carries dcb-service's own words for a GraphQL error", () => {
		expect(
			userFacingReason(graphQLError("Mapping editing is disabled")),
		).toBe("Mapping editing is disabled");
	});

	it("carries a success:false message", () => {
		expect(userFacingReason(new UserFacingError("Not yours to delete"))).toBe(
			"Not yours to delete",
		);
	});

	it("says nothing for a transport failure, whose message is the browser's", () => {
		expect(userFacingReason(new TypeError("Failed to fetch"))).toBeUndefined();
	});

	it("says nothing for an empty reason", () => {
		expect(userFacingReason(new UserFacingError(null))).toBeUndefined();
		expect(userFacingReason(graphQLError(""))).toBeUndefined();
	});
});
