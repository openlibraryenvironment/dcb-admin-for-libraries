import { beforeAll, describe, expect, it } from "vitest";

import i18n from "@/i18n";
import { dcbStatusValueOptions } from "@constants/statuses/DCBStatuses";
import enGB from "../src/locales/en-GB/en-GB.json";
import enUS from "../src/locales/en-US/en-US.json";

/**
 * The options are built when their module loads, which is before the locale's
 * bundle has, and a grid holds on to them after the user changes locale.
 */
describe("status filter labels", () => {
	beforeAll(() => {
		i18n.addResourceBundle("en-GB", "translation", enGB);
		i18n.addResourceBundle("en-US", "translation", enUS);
	});

	it("follow the language in force, not the one at import", async () => {
		const cancelled = dcbStatusValueOptions.find(
			(option) => option.value === "CANCELLED",
		);

		await i18n.changeLanguage("en-GB");
		expect(cancelled?.label).toBe("Cancelled");

		await i18n.changeLanguage("en-US");
		expect(cancelled?.label).toBe("Canceled");
	});
});
