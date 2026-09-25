import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

import { storageKey } from "../src/helpers/appBase";
import { THEME_MODES } from "../src/hooks/useThemeStore";
import { readSystemMode } from "../src/hooks/useResolvedMode";

/**
 * The inline script in index.html duplicates three facts the application also
 * holds in TypeScript: the storage key, the list of schemes, and the order the
 * two media queries are consulted in. It has to - it runs before any module
 * exists - so this runs the SHIPPED script against the real values rather than
 * trusting the copy.
 */
const html = readFileSync("index.html", "utf8");

const scriptBody = (() => {
	const match = html.match(/<script>([\s\S]*?)<\/script>/);
	if (!match) throw new Error("index.html carries no inline script");
	return match[1].replace(/%BASE_URL%/g, "/");
})();

interface Run {
	stored?: string;
	contrast?: boolean;
	dark?: boolean;
}

const keysRead: string[] = [];

const run = ({ stored, contrast = false, dark = false }: Run): string[] => {
	const attributes: string[] = [];
	const documentStub = {
		documentElement: {
			setAttribute: (name: string) => attributes.push(name),
		},
	};
	const localStorageStub = {
		getItem: (key: string) => {
			keysRead.push(key);
			return stored ?? null;
		},
	};
	const matchMediaStub = (query: string) => ({
		matches: query.includes("prefers-contrast") ? contrast : dark,
	});

	new Function(
		"document",
		"localStorage",
		"matchMedia",
		scriptBody,
	)(documentStub, localStorageStub, matchMediaStub);

	return attributes;
};

const persisted = (mode: unknown) => JSON.stringify({ state: { mode }, version: 0 });

describe("the pre-paint colour scheme script", () => {
	it("reads the key the store actually writes", () => {
		keysRead.length = 0;
		run({});
		expect(keysRead).toEqual([storageKey("dcb-admin-libraries-theme")]);
	});

	it("names every scheme the application declares, and only those", () => {
		const declared = scriptBody.match(/var schemes = \[([^\]]*)\]/);
		expect(declared).not.toBeNull();
		const names = declared![1]
			.split(",")
			.map((name) => name.trim().replace(/^"|"$/g, ""));
		expect(names).toEqual([...THEME_MODES]);
	});

	it("applies a stored choice", () => {
		for (const mode of THEME_MODES) {
			expect(run({ stored: persisted(mode) })).toEqual([`data-${mode}`]);
		}
	});

	it("keeps a stored choice even when the device asks for something else", () => {
		expect(run({ stored: persisted("light"), dark: true, contrast: true })).toEqual([
			"data-light",
		]);
	});

	/**
	 * Not a copy of the expected answers: the SAME four device states are put to
	 * both implementations, so a change to one that the other does not follow
	 * fails here rather than showing up as a scheme that changes on mount.
	 */
	it("falls back to the device exactly as readSystemMode does", () => {
		for (const contrast of [false, true]) {
			for (const dark of [false, true]) {
				vi.stubGlobal("window", {
					matchMedia: (query: string) => ({
						matches: query.includes("prefers-contrast") ? contrast : dark,
					}),
				});
				expect(run({ contrast, dark })).toEqual([`data-${readSystemMode()}`]);
				vi.unstubAllGlobals();
			}
		}
	});

	it("survives storage an older build wrote", () => {
		expect(run({ stored: "not json" })).toEqual(["data-light"]);
		expect(run({ stored: persisted("sepia") })).toEqual(["data-light"]);
		expect(run({ stored: persisted(null) })).toEqual(["data-light"]);
		expect(run({ stored: JSON.stringify({ version: 0 }) })).toEqual(["data-light"]);
		expect(run({ stored: persisted("sepia"), dark: true })).toEqual(["data-dark"]);
	});
});
