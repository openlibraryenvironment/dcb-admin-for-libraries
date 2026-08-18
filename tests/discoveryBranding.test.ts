import { describe, it, expect } from "vitest";

import {
	BRAND_LIMITS,
	DISCOVERY_THEME_NAMES,
	isValidLogoUrl,
	themeOptions,
} from "@constants/discoveryBranding";
import en from "../src/locales/en/en.json";

/**
 * The brand logo URL becomes the `src` of an `<img>` in the chrome of every page of the
 * patron app, on an anonymous route. dcb-service's BrandingValidator is the authority;
 * these cases mirror it, so a library administrator is told at the field rather than by a
 * rejected save, and so the two cannot drift apart unnoticed.
 */
describe("isValidLogoUrl", () => {
	it("accepts absolute http and https URLs", () => {
		expect(isValidLogoUrl("https://library.example.org/logo.svg")).toBe(true);
		expect(isValidLogoUrl("http://library.example.org/logo.svg")).toBe(true);
		expect(isValidLogoUrl("  https://library.example.org/logo.svg  ")).toBe(true);
	});

	it("accepts blank, which clears the field", () => {
		expect(isValidLogoUrl("")).toBe(true);
		expect(isValidLogoUrl("   ")).toBe(true);
		expect(isValidLogoUrl(null)).toBe(true);
		expect(isValidLogoUrl(undefined)).toBe(true);
	});

	it("rejects schemes that are not http(s)", () => {
		expect(isValidLogoUrl("javascript:alert(1)")).toBe(false);
		expect(isValidLogoUrl("data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=")).toBe(
			false,
		);
	});

	it("rejects anything that leaves the origin implicit", () => {
		// Stored by one origin and rendered by another, so these resolve against the
		// wrong host without ever looking like they did.
		expect(isValidLogoUrl("//library.example.org/logo.svg")).toBe(false);
		expect(isValidLogoUrl("/logo.svg")).toBe(false);
		expect(isValidLogoUrl("logo.svg")).toBe(false);
	});

	it("rejects an http(s) URL with no host", () => {
		expect(isValidLogoUrl("https://")).toBe(false);
	});
});

describe("themeOptions", () => {
	it("offers the themes the discovery app ships", () => {
		expect(themeOptions()).toEqual([...DISCOVERY_THEME_NAMES]);
	});

	it("includes a stored theme this build does not know", () => {
		// A deployment that widened dcb.branding.theme-names for its own discovery
		// frontend. Dropping the value would clear this library's theme on the next save.
		expect(themeOptions("tenantBrand")).toEqual([
			...DISCOVERY_THEME_NAMES,
			"tenantBrand",
		]);
	});

	it("does not repeat a stored theme that is already known", () => {
		expect(themeOptions("kInt")).toEqual([...DISCOVERY_THEME_NAMES]);
	});
});

describe("brand field limits", () => {
	it("matches the column widths in dcb-service's library brand migration", () => {
		// V8_73_002. A value the database would truncate is refused here, with a message.
		expect(BRAND_LIMITS).toEqual({ logoUrl: 400, logoAlt: 255, themeName: 64 });
	});
});

describe("brand translations", () => {
	it("has a string for every key the library form renders", () => {
		const brand = en.library.brand as Record<string, string>;

		for (const key of [
			"section",
			"section_help",
			"logo_url",
			"logo_url_help",
			"logo_url_invalid",
			"logo_alt",
			"logo_alt_help",
			"theme",
			"theme_help",
			"theme_inherit",
		]) {
			expect(typeof brand[key], key).toBe("string");
		}
	});
});
