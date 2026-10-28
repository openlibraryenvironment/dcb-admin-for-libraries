import { afterEach, describe, expect, it, vi } from "vitest";

import { HIGHLIGHTS, READ_ONLY_HIGHLIGHTS } from "@constants/releaseHighlights";
import { featureSince } from "@helpers/libraryFeatures";
import { highlightsHere } from "@helpers/releaseHighlights";
import enGB from "../src/locales/en-GB/en-GB.json" with { type: "json" };

afterEach(() => vi.unstubAllGlobals());

const switchedOn = (...flags: string[]) =>
	vi.stubGlobal("window", {
		__APP_ENV__: Object.fromEntries(flags.map((flag) => [flag, "true"])),
	});

const keys = (items: readonly { key: string }[]) => items.map((item) => item.key);

const DCB_9_2_0 = [
	"VITE_FEATURE_GUARDED_CLEANUP",
	"VITE_FEATURE_REQUEST_NOTES",
	"VITE_FEATURE_REQUEST_TAGS",
	"VITE_FEATURE_PICKUP_REQUESTS",
];

describe("the highlights a deployment shows", () => {
	it("on 8.71.0, with nothing switched on, names what this release has that it does not", () => {
		switchedOn();
		const { shown, notHere } = highlightsHere(HIGHLIGHTS);

		expect(keys(shown)).toEqual(["home", "walk_up", "views", "accessibility"]);
		expect(notHere).toEqual([
			"guarded_cleanup",
			"request_notes",
			"request_tags",
			"pickup_requests",
		]);
	});

	it("on 9.2.0 with its features switched on, shows every highlight and nothing as missing", () => {
		switchedOn(...DCB_9_2_0);
		const { shown, notHere } = highlightsHere(HIGHLIGHTS);

		expect(keys(shown)).toEqual(keys(HIGHLIGHTS));
		expect(notHere).toEqual([]);
	});

	it("with one feature left off, holds its highlight back and names only that feature", () => {
		switchedOn(...DCB_9_2_0.filter((flag) => flag !== "VITE_FEATURE_REQUEST_NOTES"));
		const { shown, notHere } = highlightsHere(HIGHLIGHTS);

		expect(keys(shown)).not.toContain("requests");
		expect(notHere).toEqual(["request_notes"]);
	});

	it("gives a read-only user nothing that depends on the service", () => {
		switchedOn();
		const { shown, notHere } = highlightsHere(READ_ONLY_HIGHLIGHTS);

		expect(keys(shown)).toEqual(keys(READ_ONLY_HIGHLIGHTS));
		expect(notHere).toEqual([]);
	});
});

describe("the highlights as written", () => {
	it("keep to five, docs/release-highlights.md's limit", () => {
		expect(HIGHLIGHTS.length).toBeLessThanOrEqual(5);
		expect(READ_ONLY_HIGHLIGHTS.length).toBeLessThanOrEqual(5);
	});

	it("each have a heading and a body", () => {
		const items: Record<string, { heading?: string; body?: string }> =
			enGB.release_highlights.items;
		for (const key of keys([...HIGHLIGHTS, ...READ_ONLY_HIGHLIGHTS])) {
			expect(items[key]?.heading, key).toBeTruthy();
			expect(items[key]?.body, key).toBeTruthy();
		}
	});

	it("need only features some release has, so 'needs DCB service' always names one", () => {
		for (const feature of HIGHLIGHTS.flatMap((item) => item.needs ?? [])) {
			expect(featureSince(feature), feature).not.toBeNull();
		}
	});
});
