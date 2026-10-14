import { afterEach, describe, expect, it, vi } from "vitest";

import { HIGHLIGHTS_GENERATION, shouldShowHighlights } from "@constants/releaseHighlights";
import { storageKey } from "@helpers/appBase";
import {
	RELEASES_URL,
	parseVersion,
	readSeenHighlights,
	releaseNotesUrl,
	versionFromBundleUrl,
	writeSeenHighlights,
} from "@helpers/release";

afterEach(() => vi.unstubAllGlobals());

describe("a version a deploy wrote", () => {
	it.each([
		["v1.14.0", "1.14.0"],
		["1.14.0", "1.14.0"],
		[" v2.0.10 ", "2.0.10"],
	])("reads %j as %j", (raw, version) => {
		expect(parseVersion(raw)).toBe(version);
	});

	it.each([[""], ["latest"], ["v1.14"], ["1.14.0-beta.1"], [14], [null], [{ version: "1.0.0" }]])(
		"is no version when it is %j",
		(raw) => {
			expect(parseVersion(raw)).toBeNull();
		},
	);
});

describe("the bootloader's bundle URL", () => {
	it("names the release it serves", () => {
		expect(
			versionFromBundleUrl("https://bundles.example/dcb-admin-for-libraries/v1.14.0/"),
		).toBe("1.14.0");
	});

	it.each([
		[undefined],
		["https://bundles.example/dcb-admin-for-libraries/latest/"],
		["https://host.example/dcb-admin-for-libraries/"],
		["https://bundles.example/v1.14.0/assets/"],
	])("names none in %j", (url) => {
		expect(versionFromBundleUrl(url)).toBeNull();
	});
});

describe("release notes", () => {
	it("link to the version's own page, or every release when it is not known", () => {
		expect(releaseNotesUrl("1.14.0")).toBe(`${RELEASES_URL}/tag/v1.14.0`);
		expect(releaseNotesUrl(null)).toBe(RELEASES_URL);
		expect(RELEASES_URL).toBe(
			"https://github.com/openlibraryenvironment/dcb-admin-for-libraries/releases",
		);
	});
});

describe("the highlights a browser has seen", () => {
	const storing = (initial: Record<string, string> = {}) => {
		const values = new Map(Object.entries(initial));
		vi.stubGlobal("localStorage", {
			getItem: (key: string) => values.get(key) ?? null,
			setItem: (key: string, value: string) => values.set(key, value),
		});
		return values;
	};

	it("are shown once to a browser that has seen none, and not after it is closed", () => {
		storing();
		expect(shouldShowHighlights(readSeenHighlights())).toBe(true);

		writeSeenHighlights(HIGHLIGHTS_GENERATION);

		expect(shouldShowHighlights(readSeenHighlights())).toBe(false);
	});

	it("are shown again for a newer generation", () => {
		storing({ [storageKey("releaseHighlightsSeen")]: String(HIGHLIGHTS_GENERATION - 1) });
		expect(shouldShowHighlights(readSeenHighlights())).toBe(true);
	});

	it.each([["-3"], ["two"], [""]])("read a stored %j as none seen", (stored) => {
		storing({ [storageKey("releaseHighlightsSeen")]: stored });
		expect(readSeenHighlights()).toBe(0);
	});

	it("read blocked storage as none seen, and do not throw writing to it", () => {
		vi.stubGlobal("localStorage", {
			getItem: () => {
				throw new Error("blocked");
			},
			setItem: () => {
				throw new Error("blocked");
			},
		});
		expect(readSeenHighlights()).toBe(0);
		expect(() => writeSeenHighlights(HIGHLIGHTS_GENERATION)).not.toThrow();
	});
});
