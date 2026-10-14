import { describe, expect, it } from "vitest";
import {
	buildFilterQuery,
	escapeLucene,
} from "@helpers/dataGrid/buildFilterQuery";
import { processGridFilterModel } from "@helpers/dataGrid/utilities";
import { GridLogicOperator } from "@mui/x-data-grid-premium";

describe("escapeLucene", () => {
	it.each([
		["(test)", "\\(test\\)"],
		["a:b", "a\\:b"],
		['say "hi"', 'say \\"hi\\"'],
		["50*", "50\\*"],
		["a || b", "a \\|\\| b"],
		["a && b", "a \\&\\& b"],
		["C:\\path", "C\\:\\\\path"],
		["plain", "plain"],
		// A bare operator word is a parse error, and the grid would reset
		["AND", "\\AND"],
		["OR", "\\OR"],
		["NOT", "\\NOT"],
		["ANDROID", "ANDROID"],
	])("escapes %s", (raw, escaped) => {
		expect(escapeLucene(raw)).toBe(escaped);
	});
});

describe("buildFilterQuery", () => {
	it("keeps the contains wildcards around an escaped value", () => {
		expect(buildFilterQuery("description", "contains", "(urgent)")).toBe(
			"description:*\\(urgent\\)*",
		);
	});

	it("keeps a phrase as one term by turning spaces into ?", () => {
		expect(buildFilterQuery("description", "contains", "two words")).toBe(
			"description:*two?words*",
		);
	});

	it("cannot be used to add a clause", () => {
		expect(
			buildFilterQuery("errorMessage", "equals", "x || status:COMPLETED"),
		).toBe("errorMessage:x?\\|\\|?status\\:COMPLETED");
	});

	it("escapes a quote inside an isAnyOf option", () => {
		expect(buildFilterQuery("status", "isAnyOf", ['a"b', "c"])).toBe(
			'status:("a\\"b" OR "c")',
		);
	});

	it("escapes the does-not-equal operand, grouped", () => {
		expect(buildFilterQuery("toValue", "!=", "a:b")).toBe(
			"(*:* AND NOT (toValue:a\\:b))",
		);
	});

	it("keeps a pasted tab or newline inside one term", () => {
		expect(buildFilterQuery("description", "contains", "two\twords\nhere")).toBe(
			"description:*two?words?here*",
		);
	});

	it.each([[""], [[]]])("treats %j as no filter", (value) => {
		expect(buildFilterQuery("status", "is", value)).toBeNull();
	});

	it("leaves a number alone", () => {
		expect(buildFilterQuery("pollCountForCurrentStatus", ">=", 3)).toBe(
			"pollCountForCurrentStatus:[3 TO *]",
		);
	});

	it("converts a duration in days to seconds", () => {
		expect(buildFilterQuery("elapsedTimeInCurrentStatus", ">", 2)).toBe(
			"elapsedTimeInCurrentStatus:{172800 TO *}",
		);
	});

	it("still builds an ordinary equals", () => {
		expect(
			buildFilterQuery("id", "equals", "11111111-1111-1111-1111-111111111111"),
		).toBe("id:11111111\\-1111\\-1111\\-1111\\-111111111111");
	});
});

describe("processGridFilterModel", () => {
	it("keeps OR across a negated clause", () => {
		expect(
			processGridFilterModel(
				{
					items: [
						{ id: 1, field: "status", operator: "is", value: "ERROR" },
						{ id: 2, field: "status", operator: "not", value: "COMPLETED" },
					],
					logicOperator: GridLogicOperator.Or,
				},
				"",
			),
		).toBe("(status:ERROR OR (*:* AND NOT (status:COMPLETED)))");
	});

	it("keeps a pasted tab inside one quick-filter term", () => {
		expect(
			processGridFilterModel({ items: [], quickFilterValues: ["a\tb"] }, "", ["name"]),
		).toBe("(name:*a?b*)");
	});

	it("escapes the quick filter", () => {
		expect(
			processGridFilterModel(
				{ items: [], quickFilterValues: ["a:b"] },
				"agency:1",
				["name"],
			),
		).toBe("agency:1 AND ((name:*a\\:b*))");
	});
});
