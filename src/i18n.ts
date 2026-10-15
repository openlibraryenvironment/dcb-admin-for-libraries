import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import type { AppLocale } from "@helpers/locale";
import { currentLocale } from "@/hooks/useLocaleStore";

// One chunk per locale, so a deployment downloads only the English it uses.
const BUNDLES: Record<
	AppLocale,
	() => Promise<{ default: Record<string, unknown> }>
> = {
	"en-US": () => import("./locales/en-US/en-US.json"),
	"en-GB": () => import("./locales/en-GB/en-GB.json"),
};

i18n.use(initReactI18next).init({
	resources: {},
	// Both bundles carry every key (tests/localeParity.test.ts), so there is
	// nothing to fall back to.
	fallbackLng: false,
	interpolation: {
		escapeValue: false, // React already does escaping
	},
});

/**
 * Loads and switches to the locale in force. Awaited before the first render,
 * and again on every change to the user's choice.
 */
export async function applyLanguage(): Promise<void> {
	const language = currentLocale();
	if (!i18n.hasResourceBundle(language, "translation")) {
		const { default: bundle } = await BUNDLES[language]();
		i18n.addResourceBundle(language, "translation", bundle);
	}
	await i18n.changeLanguage(language);
	// Screen readers pronounce by it (WCAG 3.1.1).
	document.documentElement.lang = language;
}

export default i18n;
