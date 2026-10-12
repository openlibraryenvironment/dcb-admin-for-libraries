type ExcelJs = typeof import("@mui/x-internal-exceljs-fork");

export interface XlsxColumn {
	headerName: string;
	type?: string;
}

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const asDate = (value: unknown): Date | unknown => {
	if (value instanceof Date) return value;
	if (typeof value !== "string") return value;
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? value : date;
};

/**
 * One worksheet: a header row, then the rows as given. A string is written as a string
 * cell, which a spreadsheet displays and never evaluates; exceljs writes a formula only
 * for a `{ formula }` value, and nothing here builds one.
 */
export const buildXlsx = async (
	columns: readonly XlsxColumn[],
	rows: readonly (readonly unknown[])[],
): Promise<Blob> => {
	// Loaded here and nowhere else, so only someone exporting Excel downloads it.
	const module = await import("@mui/x-internal-exceljs-fork");
	const ExcelJS: ExcelJs = (module as { default?: ExcelJs }).default ?? module;

	const workbook = new ExcelJS.Workbook();
	const sheet = workbook.addWorksheet("Export");
	sheet.columns = columns.map((column) => ({
		header: column.headerName,
		width: Math.min(60, Math.max(12, column.headerName.length + 2)),
		style:
			column.type === "dateTime" || column.type === "date"
				? { numFmt: column.type === "date" ? "yyyy-mm-dd" : "yyyy-mm-dd hh:mm:ss" }
				: {},
	}));

	for (const row of rows) {
		sheet.addRow(
			row.map((value, index) => {
				if (value === null || value === undefined) return null;
				const type = columns[index]?.type;
				if (type === "dateTime" || type === "date") return asDate(value);
				if (typeof value === "number" || typeof value === "boolean") return value;
				return String(value);
			}),
		);
	}

	const buffer = await workbook.xlsx.writeBuffer();
	return new Blob([buffer as ArrayBuffer], { type: XLSX_MIME });
};
