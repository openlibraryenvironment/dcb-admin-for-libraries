import { create } from "zustand";
import { persist } from "zustand/middleware";

import { storageKey } from "@helpers/appBase";

// The "traditional ILL" unit cost is deliberately NOT shipped with a default value -
// stating a cost the consortium did not choose would poison the credibility of the
// whole value story. It is entered by the user and remembered locally. Cost
// avoidance is then computed client-side as successfulCount * illUnitCost.

const DEFAULT_CURRENCY = "GBP";

/**
 * ISO 4217, three letters. Checked against Intl rather than a list of our own,
 * which is the same check that will throw at the formatter if it is wrong.
 */
export const isCurrencyCode = (value: unknown): value is string => {
	if (typeof value !== "string" || !/^[A-Za-z]{3}$/.test(value)) return false;
	try {
		new Intl.NumberFormat(undefined, { style: "currency", currency: value });
		return true;
	} catch {
		return false;
	}
};

interface InsightsCostState {
	illUnitCost: number | null;
	/** ISO 4217. Nothing sets it yet - see docs/formatting.md. */
	currency: string;
	setIllUnitCost: (cost: number | null) => void;
	setCurrency: (currency: string) => void;
}

export const useInsightsCostStore = create<InsightsCostState>()(
	persist(
		(set) => ({
			illUnitCost: null,
			currency: DEFAULT_CURRENCY,
			setIllUnitCost: (illUnitCost) => set({ illUnitCost }),
			setCurrency: (currency) =>
				set({ currency: isCurrencyCode(currency) ? currency : DEFAULT_CURRENCY }),
		}),
		{
			name: storageKey("dcb-insights-ill-cost"),
			/**
			 * This store used to hold a currency SYMBOL. Storage written by that
			 * build rehydrates with no `currency` at all, and Intl throws rather
			 * than degrades when asked to format a currency of undefined - which
			 * would take the whole Insights page down.
			 */
			merge: (persisted, current) => {
				const stored = (persisted ?? {}) as Partial<InsightsCostState>;
				return {
					...current,
					...stored,
					currency: isCurrencyCode(stored.currency)
						? stored.currency
						: DEFAULT_CURRENCY,
				};
			},
		},
	),
);
