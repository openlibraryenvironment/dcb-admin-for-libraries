import i18n from "@/i18n";
import { formatDuration } from "../formatDuration";
import type { ExportColumn } from "./exportOptions";

// type for nested field paths
type SimpleField = string;
interface NestedField {
	field: string;
	path: string[];
	arrayHandler?: (value: any[]) => any;
}
type FieldPath = SimpleField | NestedField;

const isNestedField = (field: FieldPath): field is NestedField => {
	return typeof field === "object" && "path" in field;
};
// function to get value from nested path
const getNestedValue = (item: any, path: string[]): any => {
	return path.reduce((obj, key) => (obj ? obj[key] : undefined), item);
};

/**
 * A spreadsheet runs a cell starting with one of these as a formula. The text
 * here is patron- and library-entered (notes, titles, error messages), so an
 * export opened in Excel would otherwise execute it.
 */
const FORMULA_TRIGGER = /^[=+\-@\t\r]/;

export const formatCellValue = (
	value: any,
	delimiter: string,
	field: string,
): string => {
	if (value === null || value === undefined) {
		return "";
	}
	if (field == "elapsedTimeInCurrentStatus") {
		return formatDuration(value);
	}
	if (typeof value === "number" || typeof value === "boolean") {
		return String(value);
	}
	let text = String(value);
	if (FORMULA_TRIGGER.test(text)) {
		text = `'${text}`;
	}
	if (
		text.includes(delimiter) ||
		text.includes('"') ||
		text.includes("\n") ||
		text.includes("\r")
	) {
		return `"${text.replace(/"/g, '""')}"`;
	}
	return text;
};
// Array handlers for cases like supplying agency where we need to get the first value in an array
const arrayHandlers = {
	firstItem: (arr: any[]) => (arr && arr.length > 0 ? arr[0] : undefined),
};

// Define field mappings for complex nested fields - add new ones here
const getFieldMapping = (field: string): FieldPath => {
	const fieldMappings: Record<string, FieldPath> = {
		agencyCode: { field: "agencyCode", path: ["agency", "code"] },
		clusterRecordTitle: {
			field: "clusterRecordTitle",
			path: ["clusterRecord", "title"],
		},
		patronBarcode: {
			field: "patronBarcode",
			path: ["requestingIdentity", "localBarcode"],
		},
		canonicalPtype: {
			field: "canonicalPtype",
			path: ["requestingIdentity", "canonicalPtype"],
		},
		supplyingAgencyCode: {
			field: "supplyingAgencyCode",
			path: ["suppliers"],
			arrayHandler: (suppliers) => {
				const firstSupplier = arrayHandlers.firstItem(suppliers);
				return firstSupplier?.localAgency;
			},
		},
		canonicalItemType: {
			field: "canonicalItemType",
			path: ["suppliers"],
			arrayHandler: (suppliers) => {
				const firstSupplier = arrayHandlers.firstItem(suppliers);
				return firstSupplier?.canonicalItemType;
			},
		},
		itemBarcode: {
			field: "itemBarcode",
			path: ["suppliers"],
			arrayHandler: (suppliers) => {
				const firstSupplier = arrayHandlers.firstItem(suppliers);
				return firstSupplier?.localItemBarcode;
			},
		},
		localItemType: {
			field: "localItemType",
			path: ["suppliers"],
			arrayHandler: (suppliers) => {
				const firstSupplier = arrayHandlers.firstItem(suppliers);
				return firstSupplier?.localItemType;
			},
		},
	};

	return fieldMappings[field] || field;
};

const getFieldValue = (item: any, fieldMapping: FieldPath): any => {
	if (!isNestedField(fieldMapping)) {
		return item[fieldMapping]; // For simple fields, no need to call the getNestedValue method
	}

	const nestedValue = getNestedValue(item, fieldMapping.path);

	if (fieldMapping.arrayHandler && Array.isArray(nestedValue)) {
		return fieldMapping.arrayHandler(nestedValue);
	}

	return nestedValue;
};

const SUPPLIER_LEAF: Record<string, string> = {
	supplyingAgencyCode: "localAgency",
	canonicalItemType: "canonicalItemType",
	itemBarcode: "localItemBarcode",
	localItemType: "localItemType",
};

/** The dotted path, under a request, that a column's export value is read from. */
export const exportSourceField = (field: string): string => {
	const mapping = getFieldMapping(field);
	if (!isNestedField(mapping)) return mapping;
	return mapping.arrayHandler
		? `${mapping.path.join(".")}.${SUPPLIER_LEAF[field] ?? field}`
		: mapping.path.join(".");
};

/**
 * Request fields an export offers that neither request grid shows as a column. A function
 * so the headers are in the language the reader has when they export.
 */
export const EXPORT_ONLY_COLUMNS = (t: (key: string) => string = i18n.t): ExportColumn[] => [
	{ field: "pickupLocationCode", headerName: t("grid.headers.pickup_location") },
	// A Host LMS code, which several libraries can share: not a library
	{ field: "patronHostlmsCode", headerName: t("patron_request.patron_hostlms") },
];

/** A column's value for one request, before a file format is applied. */
export const exportValue = (item: unknown, field: string): unknown => {
	const value = getFieldValue(item ?? {}, getFieldMapping(field));
	return field === "elapsedTimeInCurrentStatus" && typeof value === "number"
		? formatDuration(value)
		: value;
};

/** The value as the grid shows it: a select column's label rather than its code. */
export const exportCell = (item: unknown, column: ExportColumn): unknown => {
	const value = exportValue(item, column.field);
	return column.labels && value !== null && value !== undefined
		? (column.labels[String(value)] ?? value)
		: value;
};

export const convertFileToString = (
	data: readonly unknown[],
	delimiter: string,
	columns: readonly ExportColumn[],
) => {
	const headerRow = columns
		.map((column) => formatCellValue(column.headerName, delimiter, ""))
		.join(delimiter);

	const rows = data.map((item) =>
		columns
			.map((column) =>
				formatCellValue(exportCell(item, column), delimiter, ""),
			)
			.join(delimiter),
	);

	return [headerRow, ...rows].join("\n");
};
