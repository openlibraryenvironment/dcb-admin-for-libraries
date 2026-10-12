import { describe, expect, it } from "vitest";
import { classifyServiceError } from "@helpers/serviceErrors";

describe("classifyServiceError", () => {
	it.each([
		["Chromium", "Failed to fetch"],
		["Firefox", "NetworkError when attempting to fetch resource."],
		// Safari's wording; before this, a Safari user never reached the network page.
		["Safari", "Load failed"],
		["React Native polyfills", "Network request failed"],
	])("treats %s's fetch failure as a network error", (_, message) => {
		expect(classifyServiceError(new TypeError(message))).toBe("network");
	});

	it("treats a 503 as maintenance", () => {
		expect(classifyServiceError({ response: { status: 503 } })).toBe("maintenance");
	});

	it("leaves every other failure to the page that made the request", () => {
		expect(classifyServiceError({ response: { status: 500 } })).toBeNull();
		expect(classifyServiceError(new Error("GraphQL Error (Code: 200)"))).toBeNull();
		expect(classifyServiceError(undefined)).toBeNull();
	});
});
