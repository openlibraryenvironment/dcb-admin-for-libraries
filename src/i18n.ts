import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import { DEFAULT_LOCALE, type AppLocale } from "@helpers/locale";
import { currentLocale } from "@/hooks/useLocaleStore";

type Bundle = () => Promise<{ default: Record<string, unknown> }>;

/**
 * en-GB is the whole catalogue. Any other locale is an overlay holding only the strings
 * that differ, and falls back to en-GB for the rest: docs/theming.md, "8. Language".
 * Each is a chunk of its own, fetched before the first render.
 */
const CATALOGUE: Bundle = () => import("./locales/en-GB/en-GB.json");
const OVERLAYS: Partial<Record<AppLocale, Bundle>> = {
	"en-US": () => import("./locales/en-US/en-US.json"),
};

i18n.use(initReactI18next).init({
	resources: {},
	fallbackLng: (code) => (code === DEFAULT_LOCALE ? [] : [DEFAULT_LOCALE]),
	// Without it, en-US also looks for an "en" bundle that never exists.
	load: "currentOnly",
	interpolation: {
		escapeValue: false, // React already does escaping
	},
});

const ensure = async (language: AppLocale, bundle: Bundle | undefined) => {
	if (!bundle || i18n.hasResourceBundle(language, "translation")) return;
	const { default: messages } = await bundle();
	i18n.addResourceBundle(language, "translation", messages);
};

/**
 * Loads and switches to the locale in force. Awaited before the first render,
 * and again on every change to the user's choice.
 */
export async function applyLanguage(): Promise<void> {
	const language = currentLocale();
	await Promise.all([
		ensure(DEFAULT_LOCALE, CATALOGUE),
		ensure(language, OVERLAYS[language]),
	]);
	// Another choice made while a bundle loaded has been applied already; this one is stale
	if (currentLocale() !== language) return;
	await i18n.changeLanguage(language);
	// Screen readers pronounce by it (WCAG 3.1.1).
	document.documentElement.lang = language;
}

export default i18n;
