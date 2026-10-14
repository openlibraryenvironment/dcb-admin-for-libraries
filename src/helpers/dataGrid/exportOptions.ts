import type { GridColDef } from "@mui/x-data-grid-premium";

export type ExportScope = "filtered" | "all" | "selected";
export type ExportFormat = "csv" | "tsv" | "xlsx";

export interface ExportColumn {
	field: string;
	headerName: string;
	type?: string;
	/** A select column's labels by value, so the file says what the grid shows, not a code. */
	labels?: Readonly<Record<string, string>>;
}

const labelsOf = (column: GridColDef): Record<string, string> | undefined => {
	const options = "valueOptions" in column ? column.valueOptions : undefined;
	if (column.type !== "singleSelect" || !Array.isArray(options)) return undefined;
	return Object.fromEntries(
		options.flatMap((option: unknown) =>
			typeof option === "object" && option !== null && "value" in option && "label" in option
				? [[String(option.value), String(option.label)]]
				: [],
		),
	);
};

/** What the export wizard asks for. */
export interface FileExportOptions {
	scope: ExportScope;
	format: ExportFormat;
	columns: ExportColumn[];
	fileName: string;
}

/** Every export a request grid's toolbar can start. */
export type ExportRequest =
	| FileExportOptions
	| { scope: "current" }
	| { scope: "print" };

const GRID_OWN_FIELDS = new Set([
	"__check__",
	"__detail_panel_toggle__",
	"__reorder__",
	"actions",
]);

export const exportColumnsOf = (columns: readonly GridColDef[]): ExportColumn[] =>
	columns
		.filter((column) => column.type !== "actions" && !GRID_OWN_FIELDS.has(column.field))
		.map((column) => {
			const labels = labelsOf(column);
			return {
				field: column.field,
				headerName: column.headerName || column.field,
				type: column.type,
				...(labels ? { labels } : {}),
			};
		});

export const MAX_FILE_NAME_LENGTH = 120;

// Path separators, the characters Windows refuses, and control characters.
const FORBIDDEN_IN_FILE_NAME = /[/\\:*?"<>|\p{Cc}]/u;

/** The translation key of what is wrong with a file name, or null when nothing is. */
export const exportFileNameError = (name: string): string | null => {
	const trimmed = name.trim();
	if (!trimmed) return "ui.data_grid.export.file_name_required";
	if (trimmed.length > MAX_FILE_NAME_LENGTH) {
		return "ui.data_grid.export.file_name_too_long";
	}
	if (FORBIDDEN_IN_FILE_NAME.test(trimmed) || trimmed.startsWith(".")) {
		return "ui.data_grid.export.file_name_invalid";
	}
	return null;
};

export const exportFileName = (name: string, format: ExportFormat): string => {
	const base = name.trim().replace(new RegExp(`\\.${format}$`, "i"), "");
	return `${base}.${format}`;
};
