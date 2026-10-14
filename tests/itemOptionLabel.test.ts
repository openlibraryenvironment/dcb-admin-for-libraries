import { describe, expect, it } from "vitest";
import type { TFunction } from "i18next";

import { itemOptionLabel } from "@helpers/itemOptionLabel";

/** Says which string was asked for, and with what. */
const t = ((key: string, values: Record<string, unknown>) =>
	`${key} ${JSON.stringify(values)}`) as unknown as TFunction;

const copy = {
	barcode: "30001",
	callNumber: "621.3 B",
	location: { name: "Main" },
};

describe("an item picker's label", () => {
	it("names the volume as the library typed it", () => {
		const label = itemOptionLabel(t, {
			...copy,
			rawVolumeStatement: "Vol [ 22].(1990)",
			parsedVolumeStatement: "v22y1990",
		} as never);

		expect(label).toContain("item_select_volume");
		expect(label).toContain('"volumeStatement":"Vol [ 22].(1990)"');
		expect(label).not.toContain("v22y1990");
	});

	it.each([[undefined], [null], ["  "]])(
		"names no volume when the library typed none (%j), whatever the comparison key",
		(raw) => {
			const label = itemOptionLabel(t, {
				...copy,
				rawVolumeStatement: raw,
				parsedVolumeStatement: "v2",
			} as never);

			expect(label).toMatch(/item_select /);
			expect(label).not.toContain("volumeStatement");
		},
	);
});
