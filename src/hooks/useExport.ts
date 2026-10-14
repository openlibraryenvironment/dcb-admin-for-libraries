import { RefObject, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import request, { ClientError } from "graphql-request";
import {
	GridApiPremium,
	GridFilterModel,
	GridSortModel,
	gridRowSelectionIdsSelector,
} from "@mui/x-data-grid-premium";
import { getFileNameForExport } from "@helpers/dataGrid/getFileNameForExport";
import {
	EXPORT_ONLY_COLUMNS,
	convertFileToString,
	exportCell,
} from "@helpers/dataGrid/convertFileToString";
import {
	type ExportColumn,
	type FileExportOptions,
	exportFileName,
} from "@helpers/dataGrid/exportOptions";
import {
	EXPORT_PAGE_SIZE,
	ExportIncompleteError,
	ExportTooLargeError,
	MAX_EXPORT_ROWS,
	fetchExportPages,
	type ExportPage,
} from "@helpers/dataGrid/fetchExportPages";
import { buildXlsx } from "@helpers/dataGrid/xlsxWorkbook";
import { processGridFilterModel } from "@helpers/dataGrid/utilities";
import {
	ExportScopeError,
	type ScopedRequestFields,
	agencyLocationsQuery,
	claimedAgencyCodes,
	exportGuard,
	guardedQuery,
	isRequestInExportScope,
	idsQuery,
} from "@helpers/exportScope";
import { getAgencyLocationsForExport } from "@queries/getAgencyLocationsForExport";
import { getLocationForPatronRequestGrid } from "@queries/getLocationForPatronRequestGrid";
import { getPatronRequestsForExport } from "@queries/getPatronRequestsForExport";
import { authHeaders } from "@helpers/auth";
import { currentClock } from "@/hooks/useThemeStore";

/** Whole percent of an export fetched; an empty result is a finished one. */
export const exportProgressPercent = (loaded: number, total: number): number =>
	total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : 100;

type ExportedRequest = ScopedRequestFields & { id?: string };

export interface ExportResult {
	severity: "success" | "error" | "warning";
	text: string;
}

export interface ExportProgress {
	isExporting: boolean;
	progress: number;
	totalRecords: number;
}

/** What a request grid hands its toolbar so the export wizard can run. */
export interface GridExportConfig {
	run: (options: FileExportOptions) => Promise<void>;
	cancel: () => void;
	progress: ExportProgress;
	defaultFileName: string;
	/** Fields offered beside the grid's own columns. */
	extraColumns: ExportColumn[];
}

interface UsePatronRequestExportProps {
	apiRef: RefObject<GridApiPremium | null>;
	dcbApiBase: string;
	/** The grid's own scope. The library guard is applied whatever this says. */
	baseQuery: string;
	filterModel: GridFilterModel;
	sortModel: GridSortModel;
	onExportResult: (result: ExportResult) => void;
	type: string;
}

const BYTE_ORDER_MARK = String.fromCharCode(0xfeff);

const MIME: Record<"csv" | "tsv", string> = {
	csv: "text/csv;charset=utf-8",
	tsv: "text/tab-separated-values;charset=utf-8",
};

const download = (blob: Blob, fileName: string) => {
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = fileName;
	link.style.display = "none";
	document.body.appendChild(link);
	link.click();
	link.remove();
	// Revoked a tick later: revoking synchronously can cancel the download in some browsers.
	setTimeout(() => URL.revokeObjectURL(url), 0);
};

export const usePatronRequestExport = ({
	apiRef,
	dcbApiBase,
	baseQuery,
	filterModel,
	sortModel,
	onExportResult,
	type,
}: UsePatronRequestExportProps) => {
	const { t } = useTranslation();
	const [exportProgress, setExportProgress] = useState<ExportProgress>({
		isExporting: false,
		progress: 0,
		totalRecords: 0,
	});
	const controllerRef = useRef<AbortController | null>(null);
	// Leaving the grid stops its export, so no file arrives on another page
	useEffect(() => () => controllerRef.current?.abort(), []);

	const graphql = async <T>(
		document: string,
		variables: Record<string, unknown>,
		signal: AbortSignal,
	): Promise<T> =>
		request<T>({
			url: `${dcbApiBase}/graphql`,
			document,
			variables,
			requestHeaders: await authHeaders(),
			signal,
		});

	// One request: as many agencies as the claim names, each with its Host LMS and locations.
	const ownAgenciesOf = async (
		agencyCodes: string[],
		signal: AbortSignal,
	): Promise<{ pickupLocationIds: string[]; patronHostLmsCodes: string[] }> => {
		if (agencyCodes.length === 0) return { pickupLocationIds: [], patronHostLmsCodes: [] };
		const data = await graphql<{
			agencies?: {
				content?: ({
					code?: string;
					hostLms?: { code?: string | null } | null;
					locations?: ({ id?: string } | null)[];
				} | null)[];
			};
		}>(
			getAgencyLocationsForExport,
			{ query: agencyLocationsQuery(agencyCodes), pageno: 0, pagesize: agencyCodes.length },
			signal,
		);
		const own = (data.agencies?.content ?? []).filter(
			(agency) => !!agency?.code && agencyCodes.includes(agency.code),
		);
		return {
			pickupLocationIds: own
				.flatMap((agency) => agency?.locations ?? [])
				.map((location) => location?.id)
				.filter((id): id is string => !!id),
			patronHostLmsCodes: own
				.map((agency) => agency?.hostLms?.code)
				.filter((code): code is string => !!code),
		};
	};

	// Display only, after the guard has run: a name the lookup cannot find stays a code.
	const withPickupLocationNames = async (
		rows: ExportedRequest[],
		signal: AbortSignal,
	): Promise<ExportedRequest[]> => {
		const ids = [
			...new Set(rows.map((row) => row.pickupLocationCode).filter(Boolean)),
		] as string[];
		const names = new Map<string, string>();
		try {
			for (let start = 0; start < ids.length; start += EXPORT_PAGE_SIZE) {
				const chunk = ids.slice(start, start + EXPORT_PAGE_SIZE);
				const data = await graphql<{
					locations?: { content?: { id: string; name?: string }[] };
				}>(
					getLocationForPatronRequestGrid,
					{
						query: idsQuery(chunk),
						pageno: 0,
						pagesize: chunk.length,
						order: "name",
						orderBy: "ASC",
					},
					signal,
				);
				for (const location of data.locations?.content ?? []) {
					if (location.name) names.set(location.id, location.name);
				}
			}
		} catch (error) {
			if (signal.aborted) throw error;
		}
		return rows.map((row) => ({
			...row,
			pickupLocationCode:
				(row.pickupLocationCode && names.get(row.pickupLocationCode)) ||
				row.pickupLocationCode,
		}));
	};

	const gridQueryFor = (options: FileExportOptions): string => {
		if (options.scope === "selected") {
			const ids = apiRef.current
				? Array.from(gridRowSelectionIdsSelector(apiRef).keys())
				: [];
			return idsQuery(ids);
		}
		if (options.scope === "filtered") {
			return processGridFilterModel(filterModel, baseQuery, ["status", "description"]);
		}
		return baseQuery;
	};

	const run = async (options: FileExportOptions) => {
		if (controllerRef.current) return;
		const controller = new AbortController();
		controllerRef.current = controller;
		const { signal } = controller;
		setExportProgress({ isExporting: true, progress: 0, totalRecords: 0 });

		try {
			const agencyCodes = await claimedAgencyCodes();
			const own = await ownAgenciesOf(agencyCodes, signal);
			const guard = exportGuard(
				agencyCodes,
				own.pickupLocationIds,
				own.patronHostLmsCodes,
			);
			const query = guardedQuery(guard, gridQueryFor(options));
			const document = getPatronRequestsForExport();
			const order = sortModel[0]?.field ?? "dateCreated";
			const orderBy = sortModel[0]?.sort?.toUpperCase() ?? "DESC";
			const withBarcode = options.columns.some((column) => column.field === "patronBarcode");

			// A request matched through two suppliers comes back twice; it is exported once.
			const seen = new Set<string>();
			const rows = await fetchExportPages<ExportedRequest>({
				fetchPage: async (pageno) => {
					const data = await graphql<{ patronRequests?: ExportPage<ExportedRequest> }>(
						document,
						{ query, pagesize: EXPORT_PAGE_SIZE, pageno, order, orderBy, withBarcode },
						signal,
					);
					// No list at all is no count, which fetchExportPages refuses
					return data.patronRequests ?? { totalSize: null, content: [] };
				},
				keep: (row) => {
					if (!isRequestInExportScope(row, guard)) return false;
					if (!row.id || seen.has(row.id)) return false;
					seen.add(row.id);
					return true;
				},
				signal,
				onProgress: (loaded, total) =>
					setExportProgress({
						isExporting: true,
						totalRecords: total,
						progress: exportProgressPercent(loaded, total),
					}),
			});
			if (rows.length === 0) {
				onExportResult({ severity: "warning", text: t("ui.data_grid.export.empty") });
				return;
			}
			const named = await withPickupLocationNames(rows, signal);
			signal.throwIfAborted();

			const blob =
				options.format === "xlsx"
					? await buildXlsx(
							options.columns,
							named.map((row) =>
								options.columns.map((column) => exportCell(row, column)),
							),
							currentClock(),
						)
					: new Blob(
							[
								// Excel reads a CSV without a byte-order mark in the system code page
								options.format === "csv" ? BYTE_ORDER_MARK : "",
								convertFileToString(
									named,
									options.format === "csv" ? "," : "\t",
									options.columns,
								),
							],
							{ type: MIME[options.format] },
						);
			signal.throwIfAborted();
			download(blob, exportFileName(options.fileName, options.format));
			onExportResult({
				severity: "success",
				text: t("ui.data_grid.export.success", { count: named.length }),
			});
		} catch (error) {
			if (signal.aborted) {
				onExportResult({ severity: "warning", text: t("ui.data_grid.export.cancelled") });
			} else if (error instanceof ExportTooLargeError) {
				// An error, so it stays until dismissed: it asks the reader to narrow the export
				onExportResult({
					severity: "error",
					text: t("ui.data_grid.export.too_large", {
						count: error.totalSize,
						max: MAX_EXPORT_ROWS,
					}),
				});
			} else if (error instanceof ExportIncompleteError) {
				onExportResult({ severity: "error", text: t("ui.data_grid.export.incomplete") });
			} else if (error instanceof ExportScopeError) {
				onExportResult({ severity: "error", text: t("ui.data_grid.export.scope_failed") });
			} else {
				// The status carries nothing personal, and tells support a 403 from a 502
				const status = error instanceof ClientError ? error.response.status : undefined;
				onExportResult({
					severity: "error",
					text: status
						? t("ui.data_grid.export.failed_status", { status })
						: t("ui.data_grid.export.failed"),
				});
			}
		} finally {
			controllerRef.current = null;
			setExportProgress({ isExporting: false, progress: 0, totalRecords: 0 });
		}
	};

	const cancelExport = () => controllerRef.current?.abort();
	// Once per language, not per render: the toolbar memoises the columns it offers on this
	const extraColumns = useMemo(() => EXPORT_ONLY_COLUMNS(t), [t]);

	const exportConfig: GridExportConfig = {
		run,
		cancel: cancelExport,
		progress: exportProgress,
		defaultFileName: getFileNameForExport(type),
		extraColumns,
	};

	return { exportProgress, exportConfig };
};
