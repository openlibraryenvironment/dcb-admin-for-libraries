import { afterEach, describe, expect, it, vi } from "vitest";
import { Kind, parse, type SelectionSetNode } from "graphql";
import { getPatronRequestsForExport } from "@queries/getPatronRequestsForExport";
import { standardPatronRequestColumns } from "@helpers/dataGrid/columns/patronRequestColumns";
import { standardSupplierRequestColumns } from "@helpers/dataGrid/columns/supplierRequestColumns";
import { exportColumnsOf } from "@helpers/dataGrid/exportOptions";
import { EXPORT_ONLY_COLUMNS, exportSourceField } from "@helpers/dataGrid/convertFileToString";

const FLAG = "VITE_FEATURE_AGENCY_SCOPED_REQUESTS";
const withAgencyScope = (on: boolean) =>
	vi.stubGlobal("window", { __APP_ENV__: { [FLAG]: on ? "true" : "false" } });

afterEach(() => {
	vi.unstubAllGlobals();
});

/** Every selected path under `content`, dotted: "suppliers.localAgency". */
const selectedPaths = (): Set<string> => {
	const operation = parse(getPatronRequestsForExport()).definitions[0];
	const paths = new Set<string>();
	const walk = (set: SelectionSetNode | undefined, prefix: string) => {
		for (const selection of set?.selections ?? []) {
			if (selection.kind !== Kind.FIELD) continue;
			const path = prefix + selection.name.value;
			paths.add(path);
			walk(selection.selectionSet, `${path}.`);
		}
	};
	const findContent = (set: SelectionSetNode | undefined): SelectionSetNode | undefined => {
		for (const selection of set?.selections ?? []) {
			if (selection.kind !== Kind.FIELD) continue;
			if (selection.name.value === "content") return selection.selectionSet;
			const nested = findContent(selection.selectionSet);
			if (nested) return nested;
		}
		return undefined;
	};
	if (operation.kind === Kind.OPERATION_DEFINITION) {
		walk(findContent(operation.selectionSet), "");
	}
	return paths;
};

describe("the export document", () => {
	it("selects every field the library guard reads", () => {
		withAgencyScope(true);
		const paths = selectedPaths();
		for (const path of [
			"id",
			"pickupLocationCode",
			"suppliers.localAgency",
			"requestingIdentity.resolvedAgency.code",
		]) {
			expect(paths, path).toContain(path);
		}
	});

	it("asks for a patron's barcode only when the export chose its column", () => {
		withAgencyScope(true);
		const document = getPatronRequestsForExport();
		expect(document).toContain("$withBarcode: Boolean!");
		expect(document).toMatch(/localBarcode @include\(if: \$withBarcode\)/);
	});

	it("does not ask 8.71.0 for the patron's agency, which it has never heard of", () => {
		withAgencyScope(false);
		expect(selectedPaths()).not.toContain("requestingIdentity.resolvedAgency");
	});

	it.each([
		["patron requests", standardPatronRequestColumns],
		["supplier requests", standardSupplierRequestColumns],
	])("fetches every column the %s wizard offers", (_, columns) => {
		withAgencyScope(true);
		const paths = selectedPaths();
		const unfetched = [...exportColumnsOf(columns), ...EXPORT_ONLY_COLUMNS()]
			.map((column) => exportSourceField(column.field))
			.filter((path) => !paths.has(path));
		expect(unfetched).toEqual([]);
	});
});
