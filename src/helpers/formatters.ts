/**
 * Numbers, currency and dates through Intl.
 *
 * The locale is the BROWSER'S, not i18next's, and the trailing `locale`
 * argument exists so the tests can pin one. Why, and what is deliberately not
 * formatted this way: docs/formatting.md.
 */

/**
 * Intl formatters are expensive to construct and are called once per grid cell,
 * so each distinct shape is built once and kept.
 */
const numberFormats = new Map<string, Intl.NumberFormat>();
const dateFormats = new Map<string, Intl.DateTimeFormat>();

const numberFormat = (
	options: Intl.NumberFormatOptions,
	locale?: string,
): Intl.NumberFormat => {
	const key = `${locale ?? ""}|${JSON.stringify(options)}`;
	let format = numberFormats.get(key);
	if (!format) {
		format = new Intl.NumberFormat(locale, options);
		numberFormats.set(key, format);
	}
	return format;
};

const dateFormat = (
	options: Intl.DateTimeFormatOptions,
	locale?: string,
): Intl.DateTimeFormat => {
	const key = `${locale ?? ""}|${JSON.stringify(options)}`;
	let format = dateFormats.get(key);
	if (!format) {
		format = new Intl.DateTimeFormat(locale, options);
		dateFormats.set(key, format);
	}
	return format;
};

export const formatNumber = (
	value: number,
	options: Intl.NumberFormatOptions = {},
	locale?: string,
): string => numberFormat(options, locale).format(value);

/**
 * Takes a percentage out of 100, which is the shape every caller already has.
 * Intl's percent style expects a fraction, so the division lives here rather
 * than at each call site.
 */
export const formatPercent = (
	value: number,
	fractionDigits = 1,
	locale?: string,
): string =>
	numberFormat(
		{
			style: "percent",
			minimumFractionDigits: fractionDigits,
			maximumFractionDigits: fractionDigits,
		},
		locale,
	).format(value / 100);

/** `currency` is an ISO 4217 code - "GBP", never a symbol. */
export const formatCurrency = (
	value: number,
	currency: string,
	options: Intl.NumberFormatOptions = {},
	locale?: string,
): string =>
	numberFormat({ style: "currency", currency, ...options }, locale).format(
		value,
	);

/**
 * The symbol alone, for an input adornment. From Intl rather than a table of
 * our own, because which symbol a currency takes is itself regional: USD is
 * "$" to an American and "US$" to a Canadian.
 */
export const currencySymbol = (currency: string, locale?: string): string =>
	numberFormat({ style: "currency", currency }, locale)
		.formatToParts(0)
		.find((part) => part.type === "currency")?.value ?? currency;

/** A date and time a person reads: "22 Sept 2026, 14:30". */
export const formatDateTime = (
	value: string | number | Date,
	locale?: string,
): string =>
	dateFormat({ dateStyle: "medium", timeStyle: "short" }, locale).format(
		new Date(value),
	);

/** A date with no time: "22 Sept 2026". */
export const formatDate = (
	value: string | number | Date,
	locale?: string,
): string => dateFormat({ dateStyle: "medium" }, locale).format(new Date(value));

/**
 * The long form, for the one place a due date is announced rather than listed.
 */
export const formatLongDateTime = (
	value: string | number | Date,
	locale?: string,
): string =>
	dateFormat({ dateStyle: "full", timeStyle: "short" }, locale).format(
		new Date(value),
	);
