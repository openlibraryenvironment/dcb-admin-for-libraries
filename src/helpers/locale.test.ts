import { afterEach, describe, expect, it, vi } from "vitest";

import {
	DEFAULT_LOCALE,
	deploymentLocale,
	isLanguageChoice,
	resolveLocale,
} from "@helpers/locale";

const deployedWith = (locale?: string) =>
	vi.stubGlobal("window", { __APP_ENV__: { VITE_LOCALE: locale } });

describe("the deployment's locale", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it("is en-GB when VITE_LOCALE is unset or empty", () => {
		deployedWith(undefined);
		expect(deploymentLocale()).toBe("en-GB");
		// What envsubst renders for a variable the container does not set.
		deployedWith("");
		expect(deploymentLocale()).toBe(DEFAULT_LOCALE);
	});

	it("is whatever VITE_LOCALE names, when it names a supported locale", () => {
		deployedWith("en-US");
		expect(deploymentLocale()).toBe("en-US");
	});

	it("falls back, and says so, when VITE_LOCALE names anything else", () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
		deployedWith("en-us");

		expect(deploymentLocale()).toBe("en-GB");
		expect(warn).toHaveBeenCalledWith(
			"VITE_LOCALE is neither en-US nor en-GB; using en-GB.",
		);
	});
});

describe("a user's choice", () => {
	it("follows the deployment until the user picks an English", () => {
		expect(resolveLocale("deployment", "en-GB")).toBe("en-GB");
		expect(resolveLocale("en-US", "en-GB")).toBe("en-US");
		expect(resolveLocale("en-GB", "en-US")).toBe("en-GB");
	});

	it("accepts only the choices this build offers", () => {
		expect(isLanguageChoice("deployment")).toBe(true);
		expect(isLanguageChoice("en-GB")).toBe(true);
		expect(isLanguageChoice("es")).toBe(false);
		expect(isLanguageChoice(undefined)).toBe(false);
	});
});
