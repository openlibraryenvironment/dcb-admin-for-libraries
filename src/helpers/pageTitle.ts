import i18n from "@/i18n";

/**
 * "<page> · <app>" for the document title.
 *
 * Read through the i18n instance rather than a `t` from a hook, because a
 * route's `head` runs outside React - the same reason the column definitions
 * do. It follows that a title does not re-render on a language change; that
 * matters once this application offers one.
 */
export const pageTitle = (
	key: string,
	options?: Record<string, unknown>,
): string => `${i18n.t(key, options)} \u00b7 ${i18n.t("app.name")}`;
