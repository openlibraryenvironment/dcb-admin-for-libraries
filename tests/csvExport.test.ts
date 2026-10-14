import { describe, expect, it } from "vitest";
import { formatCellValue } from "@helpers/dataGrid/convertFileToString";

describe("formatCellValue", () => {
	it.each(["=HYPERLINK(\"x\")", "+1+1", "-2+3", "@SUM(A1)", "\tcmd", "\rcmd"])(
		"neutralises a cell a spreadsheet would run as a formula: %j",
		(raw) => {
			expect(formatCellValue(raw, ",", "requesterNote")).toMatch(/^"?'/);
		},
	);

	it("quotes a value carrying the delimiter, a quote or a line break", () => {
		expect(formatCellValue("a,b", ",", "description")).toBe('"a,b"');
		expect(formatCellValue('say "hi"', ",", "description")).toBe(
			'"say ""hi"""',
		);
		expect(formatCellValue("line\nbreak", ",", "description")).toBe(
			'"line\nbreak"',
		);
		expect(formatCellValue("tab\there", "\t", "description")).toBe(
			'"tab\there"',
		);
	});

	it("neutralises before quoting, so the quote wraps the prefix", () => {
		expect(formatCellValue("=1,2", ",", "description")).toBe("\"'=1,2\"");
	});

	it("leaves numbers, booleans and ordinary text alone", () => {
		expect(formatCellValue(-5, ",", "pollCountForCurrentStatus")).toBe("-5");
		expect(formatCellValue(false, ",", "outOfSequenceFlag")).toBe("false");
		expect(formatCellValue("Anytown Library", ",", "fullName")).toBe(
			"Anytown Library",
		);
		expect(formatCellValue(null, ",", "fullName")).toBe("");
	});

	it("formats the time in status as a duration", () => {
		expect(formatCellValue(90061, ",", "elapsedTimeInCurrentStatus")).toBe(
			"1:01:01:01",
		);
	});
});

describe("a select column in an export", () => {
	it("carries its option labels, and the file says the label, not the code", async () => {
		const { exportColumnsOf } = await import("@helpers/dataGrid/exportOptions");
		const { convertFileToString } = await import("@helpers/dataGrid/convertFileToString");
		const [status] = exportColumnsOf([
			{
				field: "status",
				headerName: "Status",
				type: "singleSelect",
				valueOptions: [{ value: "ERROR", label: "Error" }],
			},
		]);

		expect(status.labels).toEqual({ ERROR: "Error" });
		expect(convertFileToString([{ status: "ERROR" }, { status: "NEW" }], ",", [status])).toBe(
			"Status\nError\nNEW",
		);
	});
});
