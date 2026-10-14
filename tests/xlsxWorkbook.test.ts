import { afterEach, describe, expect, it } from "vitest";
import { buildXlsx } from "@helpers/dataGrid/xlsxWorkbook";

const readBack = async (blob: Blob) => {
	const ExcelJS = (await import("@mui/x-internal-exceljs-fork")).default;
	const workbook = new ExcelJS.Workbook();
	await workbook.xlsx.load(await blob.arrayBuffer());
	return workbook.worksheets[0];
};

const COLUMNS = [
	{ field: "dateCreated", headerName: "Request created", type: "dateTime" },
	{ field: "requesterNote", headerName: "Requester note" },
	{ field: "pollCountForCurrentStatus", headerName: "Polling count", type: "number" },
	{ field: "outOfSequenceFlag", headerName: "Out of sequence", type: "boolean" },
];

describe("buildXlsx", () => {
	it("writes a header row, then one row per request", async () => {
		const sheet = await readBack(
			await buildXlsx(COLUMNS, [
				["2026-09-01T09:15:00Z", "first", 1, false],
				["2026-09-02T09:15:00Z", "second", 2, true],
			]),
		);
		expect(sheet.getRow(1).values).toEqual([
			undefined,
			"Request created",
			"Requester note",
			"Polling count",
			"Out of sequence",
		]);
		expect(sheet.rowCount).toBe(3);
		expect(sheet.getCell("B3").value).toBe("second");
		expect(sheet.getCell("C3").value).toBe(2);
		expect(sheet.getCell("D3").value).toBe(true);
	});

	// A patron's note is free text; a spreadsheet must never run it.
	it.each(["=HYPERLINK(\"http://x\",\"y\")", "+1+1", "-2+3", "@SUM(A1)"])(
		"writes text that looks like a formula as text: %j",
		async (note) => {
			const sheet = await readBack(
				await buildXlsx(COLUMNS, [["2026-09-01T09:15:00Z", note, 1, false]]),
			);
			const cell = sheet.getCell("B2");
			expect(cell.formula).toBeUndefined();
			expect(cell.value).toBe(note);
			expect(typeof cell.value).toBe("string");
		},
	);

	it("writes a date column as dates", async () => {
		const sheet = await readBack(
			await buildXlsx(COLUMNS, [["2026-09-01T09:15:00Z", "", 0, false]]),
		);
		const cell = sheet.getCell("A2");
		expect(cell.value).toBeInstanceOf(Date);
		expect((cell.value as Date).toISOString()).toBe("2026-09-01T09:15:00.000Z");
		expect(cell.numFmt).toMatch(/yyyy/);
	});

	it("leaves an empty or unreadable date empty rather than inventing one", async () => {
		const sheet = await readBack(
			await buildXlsx(COLUMNS, [[null, null, null, null], ["not a date", "", 0, false]]),
		);
		expect(sheet.getCell("A2").value).toBeNull();
		expect(sheet.getCell("A3").value).toBe("not a date");
	});

	describe("a date-time", () => {
		const zone = process.env.TZ;
		afterEach(() => {
			process.env.TZ = zone;
		});

		// 09:15 UTC is 10:15 in London in July: a cell holds wall time, with no zone
		it.each([
			["device", 10],
			["service", 9],
		] as const)("is written on the %s clock the grid shows", async (clock, hours) => {
			process.env.TZ = "Europe/London";
			const sheet = await readBack(
				await buildXlsx(COLUMNS, [["2026-07-01T09:15:00Z", "note", 1, false]], clock),
			);
			const value = sheet.getCell("A2").value as Date;
			expect(value.getUTCHours()).toBe(hours);
			expect(value.getUTCMinutes()).toBe(15);
		});
	});
});
