import { beforeAll, describe, expect, it } from "vitest";

import i18n from "@/i18n";
import enGB from "../src/locales/en-GB/en-GB.json";
import enUS from "../src/locales/en-US/en-US.json";

/** "1 titles found" and "institution(s)" were plurals built by hand. */
describe.each(["en-GB", "en-US"])("counted text in %s", (language) => {
	beforeAll(async () => {
		i18n.addResourceBundle("en-GB", "translation", enGB);
		i18n.addResourceBundle("en-US", "translation", enUS);
		await i18n.changeLanguage(language);
	});

	it.each([
		["requesting.titles_found", "1 title found", "2 titles found"],
		["requesting.shared_index.items_for_cluster", "1 item is associated", "2 items are associated"],
		["ui.data_grid.active_filters", "1 active filter", "2 active filters"],
		["insights.method.sample", "1 observation in", "2 observations in"],
	])("%s agrees with its count", (key, one, other) => {
		expect(i18n.t(key, { count: 1 })).toContain(one);
		expect(i18n.t(key, { count: 2 })).toContain(other);
	});

	it("counts items and institutions each in their own number", () => {
		const at = (count: number) => i18n.t("requesting.institutions", { count });
		expect(i18n.t("requesting.available_to_request", { count: 1, institutions: at(1) })).toBe(
			"1 available item at 1 institution",
		);
		expect(i18n.t("requesting.available_to_request", { count: 3, institutions: at(2) })).toBe(
			"3 available items at 2 institutions",
		);
	});
});
