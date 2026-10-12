import { describe, expect, it } from "vitest";
import type { GridColDef } from "@mui/x-data-grid-premium";
import {
	exportColumnsOf,
	exportFileName,
	exportFileNameError,
} from "@helpers/dataGrid/exportOptions";

describe("exportFileNameError", () => {
	it("accepts an ordinary name", () => {
		expect(exportFileNameError("borrowed requests 2026-10")).toBeNull();
	});

	it("requires a name", () => {
		expect(exportFileNameError("")).toBe("ui.data_grid.export.file_name_required");
		expect(exportFileNameError("   ")).toBe("ui.data_grid.export.file_name_required");
	});

	it.each(["../requests", "reports/requests", "C:\\requests", "a\\b"])(
		"refuses a path separator: %j",
		(name) => {
			expect(exportFileNameError(name)).toBe("ui.data_grid.export.file_name_invalid");
		},
	);

	it.each(["a:b", "a*b", "a?b", 'a"b', "a<b", "a>b", "a|b", "a\u0000b", "a\nb", ".hidden"])(
		"refuses a character no file system takes: %j",
		(name) => {
			expect(exportFileNameError(name)).toBe("ui.data_grid.export.file_name_invalid");
		},
	);

	it("refuses a name longer than 120 characters", () => {
		expect(exportFileNameError("a".repeat(121))).toBe(
			"ui.data_grid.export.file_name_too_long",
		);
		expect(exportFileNameError("a".repeat(120))).toBeNull();
	});
});

describe("exportFileName", () => {
	it("adds the format's extension", () => {
		expect(exportFileName("requests", "csv")).toBe("requests.csv");
		expect(exportFileName("requests", "tsv")).toBe("requests.tsv");
		expect(exportFileName("requests", "xlsx")).toBe("requests.xlsx");
	});

	it("does not double an extension the reader typed", () => {
		expect(exportFileName("requests.xlsx", "xlsx")).toBe("requests.xlsx");
		expect(exportFileName("requests.CSV", "csv")).toBe("requests.csv");
	});

	it("trims surrounding space", () => {
		expect(exportFileName("  requests  ", "csv")).toBe("requests.csv");
	});
});

describe("exportColumnsOf", () => {
	const columns: GridColDef[] = [
		{ field: "__check__", headerName: "" },
		{ field: "__detail_panel_toggle__", headerName: "" },
		{ field: "dateCreated", headerName: "Request created", type: "dateTime" },
		{ field: "status", headerName: "Status" },
		{ field: "actions", type: "actions", headerName: "Actions" },
		{ field: "noHeader" },
	];

	it("offers the data columns, by their header, and never the grid's own", () => {
		expect(exportColumnsOf(columns)).toEqual([
			{ field: "dateCreated", headerName: "Request created", type: "dateTime" },
			{ field: "status", headerName: "Status", type: undefined },
			{ field: "noHeader", headerName: "noHeader", type: undefined },
		]);
	});
});
