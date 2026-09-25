import { describe, expect, it } from "vitest";

import {
	fieldNameToLabel,
	gridFieldNameToLabel,
} from "../src/helpers/dataChangeLogHelperFunctions";

/**
 * The acronym table was dead code: lodash `capitalize` is
 * `upperFirst(toLower(s))`, so "host LMS ID" came back "Host lms id" and every
 * entry in the table was undone one line after it was applied.
 */
describe("gridFieldNameToLabel", () => {
	it("keeps an acronym uppercase", () => {
		expect(gridFieldNameToLabel("hostLmsId")).toBe("Host LMS ID");
		expect(gridFieldNameToLabel("brandLogoUrl")).toBe("Brand logo URL");
		expect(gridFieldNameToLabel("idpUrl")).toBe("IDP URL");
	});

	it("sentence-cases an ordinary field", () => {
		expect(gridFieldNameToLabel("abbreviatedName")).toBe("Abbreviated name");
	});
});

describe("fieldNameToLabel", () => {
	it("splits on underscores and keeps acronyms", () => {
		expect(fieldNameToLabel("host_lms_id")).toBe("Host LMS ID");
		expect(fieldNameToLabel("backup_downtime_schedule")).toBe(
			"Backup downtime schedule",
		);
	});

	it("leaves a single word alone but for its first letter", () => {
		expect(fieldNameToLabel("latitude")).toBe("Latitude");
	});
});
