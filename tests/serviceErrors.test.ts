import { describe, expect, it } from "vitest";
import { classifyServiceError, retryTransientOnce } from "@helpers/serviceErrors";

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

describe("retryTransientOnce", () => {
	it.each([
		["no answer at all", new TypeError("Failed to fetch")],
		["a server fault", { response: { status: 500 } }],
		["a gateway timeout", { response: { status: 504 } }],
	])("retries %s once", (_, error) => {
		expect(retryTransientOnce(0, error)).toBe(true);
		expect(retryTransientOnce(1, error)).toBe(false);
	});

	it.each([
		["a refusal", { response: { status: 403 } }],
		["a malformed request", { response: { status: 400 } }],
		["a GraphQL error carried on a 200", { response: { status: 200, errors: [{}] } }],
	])("does not retry %s, which will be the same next time", (_, error) => {
		expect(retryTransientOnce(0, error)).toBe(false);
	});
});
