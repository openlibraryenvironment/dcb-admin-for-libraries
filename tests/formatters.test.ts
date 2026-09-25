import { describe, expect, it } from "vitest";

import {
	currencySymbol,
	formatCurrency,
	formatDate,
	formatLongDateTime,
	formatNumber,
	formatPercent,
} from "../src/helpers/formatters";
import { isCurrencyCode } from "../src/hooks/insightsCostStore";

/**
 * Locales are passed explicitly here. In the application they are not: Intl
 * takes the browser's, which is the whole point - so what these pin is that the
 * REGION changes the answer, not what any one machine happens to be set to.
 */
describe("numbers", () => {
	it("groups by region", () => {
		expect(formatNumber(1234567, {}, "en-GB")).toBe("1,234,567");
		expect(formatNumber(1234567, {}, "de-DE")).toBe("1.234.567");
	});

	it("puts the decimal separator where the region does", () => {
		const options = { minimumFractionDigits: 5, maximumFractionDigits: 5 };
		expect(formatNumber(51.5, options, "en-GB")).toBe("51.50000");
		expect(formatNumber(51.5, options, "de-DE")).toBe("51,50000");
	});
});

describe("percentages", () => {
	/**
	 * Every caller holds a number out of 100, not a fraction. Passing 97.3
	 * straight to Intl's percent style would render 9,730%.
	 */
	it("takes a number out of 100", () => {
		expect(formatPercent(97.3, 1, "en-GB")).toBe("97.3%");
		expect(formatPercent(0, 1, "en-GB")).toBe("0.0%");
		expect(formatPercent(100, 1, "en-GB")).toBe("100.0%");
	});

	it("is not string concatenation", () => {
		// fr-FR puts a non-breaking space before the sign. `${n.toFixed(1)}%` could
		// not, which is what this replaced.
		expect(formatPercent(97.3, 1, "fr-FR")).not.toBe("97.3%");
		expect(formatPercent(97.3, 1, "fr-FR")).toContain("97,3");
	});
});

describe("currency", () => {
	/**
	 * The tile used to write `${symbol}${amount}`, which is wrong everywhere the
	 * symbol follows the number.
	 */
	it("places the symbol where the region does", () => {
		expect(formatCurrency(1234, "GBP", {}, "en-GB")).toBe("£1,234.00");
		expect(formatCurrency(1234, "EUR", {}, "de-DE")).toMatch(/1\.234,00\s?€/);
	});

	it("gives the symbol alone for an adornment", () => {
		expect(currencySymbol("GBP", "en-GB")).toBe("£");
		expect(currencySymbol("USD", "en-US")).toBe("$");
	});

	it("rejects anything that is not a currency code", () => {
		expect(isCurrencyCode("GBP")).toBe(true);
		expect(isCurrencyCode("usd")).toBe(true);
		// What the previous build persisted, and what Intl throws on.
		expect(isCurrencyCode("£")).toBe(false);
		expect(isCurrencyCode(undefined)).toBe(false);
		expect(isCurrencyCode("POUNDS")).toBe(false);
	});
});

describe("dates", () => {
	// Built from local components, so the machine's timezone cancels out.
	const when = new Date(2026, 8, 22, 14, 30);

	it("orders the parts the way the region does", () => {
		expect(formatDate(when, "en-GB")).toBe("22 Sept 2026");
		expect(formatDate(when, "en-US")).toBe("Sep 22, 2026");
	});

	it("does not write an American long date to a British reader", () => {
		// "dddd, MMMM D, YYYY h:mm A" was hardcoded, so every reader got this one.
		expect(formatLongDateTime(when, "en-US")).toContain("September 22, 2026");
		expect(formatLongDateTime(when, "en-GB")).toContain("22 September 2026");
	});
});
