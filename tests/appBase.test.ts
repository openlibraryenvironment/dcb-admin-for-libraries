import { afterEach, describe, expect, it, vi } from "vitest";

import { assetUrl } from "../src/helpers/appBase";

const servedFrom = (bundleBase: string | undefined) =>
	vi.stubGlobal("window", {
		location: { origin: "https://h.org" },
		__DCB_BUNDLE_BASE_URL__: bundleBase,
	});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("assetUrl", () => {
	it("resolves beside the bundle when the KI bootloader mounted it", () => {
		servedFrom("https://h.org/dcb-admin-for-libraries/v2.0.0/");
		expect(assetUrl("fallback-header.png")).toBe(
			"https://h.org/dcb-admin-for-libraries/v2.0.0/fallback-header.png",
		);
	});

	it("resolves under the app's base when it runs on its own", () => {
		servedFrom(undefined);
		expect(assetUrl("/release.json")).toBe("https://h.org/release.json");
	});
});
