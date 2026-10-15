import { describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => {
	let release: () => void = () => undefined;
	const loaded = new Promise<void>((resolve) => (release = resolve));
	return { locale: "en-US", loaded, release: () => release() };
});

vi.mock("@/hooks/useLocaleStore", () => ({ currentLocale: () => state.locale }));
// The American bundle arrives only when the test says so
vi.mock("../src/locales/en-US/en-US.json", async () => {
	await state.loaded;
	return { default: {} };
});

describe("applyLanguage", () => {
	it("leaves the user on the language they chose last, not the one that loaded last", async () => {
		vi.stubGlobal("document", { documentElement: { lang: "" } });
		const { applyLanguage, default: i18n } = await import("../src/i18n");
		i18n.addResourceBundle("en-GB", "translation", {});

		const american = applyLanguage();
		state.locale = "en-GB";
		await applyLanguage();
		state.release();
		await american;

		expect(i18n.language).toBe("en-GB");
		expect(document.documentElement.lang).toBe("en-GB");
		vi.unstubAllGlobals();
	});
});
