import "dayjs/locale/en-gb";

/**
 * Which English a deployment speaks, and which one a user has chosen instead.
 * A locale is a translation file and a date-entry convention together:
 * docs/DEPLOYMENT.md, "2c. Locale".
 */

export const SUPPORTED_LOCALES = ["en-US", "en-GB"] as const;
export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

/** What a deployment that sets nothing gets: British, as this app always was. Matches DCB Admin. */
export const DEFAULT_LOCALE: AppLocale = "en-GB";

export const isAppLocale = (value: unknown): value is AppLocale =>
	typeof value === "string" &&
	(SUPPORTED_LOCALES as readonly string[]).includes(value);

/** The dayjs locale MUI X's pickers read their date order and first weekday from. */
export const DAYJS_LOCALES: Record<AppLocale, string> = {
	"en-US": "en",
	"en-GB": "en-gb",
};

/** Each locale named in itself, so it is recognisable whatever the page is in. */
export const ENDONYMS: Record<AppLocale, string> = {
	"en-US": "English (United States)",
	"en-GB": "English (United Kingdom)",
};

let warned = false;

/** The deployment's locale from VITE_LOCALE, or the default when it is unset or unknown. */
export function deploymentLocale(): AppLocale {
	const configured =
		typeof window === "undefined" ? undefined : window.__APP_ENV__?.VITE_LOCALE;

	if (!configured) return DEFAULT_LOCALE;
	if (isAppLocale(configured)) return configured;

	if (!warned) {
		warned = true;
		console.warn("VITE_LOCALE is neither en-US nor en-GB; using en-GB.");
	}
	return DEFAULT_LOCALE;
}

/**
 * What a user may pick. "deployment" follows VITE_LOCALE and is the default, so
 * a deployment that changes its locale changes it for everyone who has not
 * chosen otherwise.
 */
export const LANGUAGE_CHOICES = ["deployment", ...SUPPORTED_LOCALES] as const;
export type LanguageChoice = (typeof LANGUAGE_CHOICES)[number];

export const isLanguageChoice = (value: unknown): value is LanguageChoice =>
	typeof value === "string" &&
	(LANGUAGE_CHOICES as readonly string[]).includes(value);

export const resolveLocale = (
	choice: LanguageChoice,
	deployment: AppLocale,
): AppLocale => (choice === "deployment" ? deployment : choice);
