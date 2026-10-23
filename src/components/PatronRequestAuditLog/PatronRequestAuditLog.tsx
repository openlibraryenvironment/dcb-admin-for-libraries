import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import request from "graphql-request";
import { authHeaders } from "@helpers/auth";
import { gridPage, queryKeys } from "@helpers/queryKeys";
import DataGrid from "@components/DataGrid/DataGrid";
import { clampPageSize } from "@constants/dataGrid/pagination";
import { auditColumns } from "@helpers/dataGrid/columns/auditColumns";
import { auditLogGrid } from "@helpers/dataGrid/gridDefinitions";
import { processGridFilterModel } from "@helpers/dataGrid/utilities";
import { AuditQueryData } from "@models/ReactQueryHelperTypes";
import { getAuditsByPatronRequest } from "@queries/getAuditByPatronRequest";
import { useDataGridErrorSafely } from "@/hooks/useDataGridErrorSafely";
import { useSyncedDataGrid } from "@/hooks/useSyncedDataGrid";

const route = getRouteApi("/__authenticated/patronRequests/$id/");

interface PatronRequestAuditLogProps {
	apiBase: string;
	patronRequestId: string;
}

export default function PatronRequestAuditLog({
	apiBase,
	patronRequestId,
}: PatronRequestAuditLogProps) {
	const { t } = useTranslation();

	const grid = useSyncedDataGrid(auditLogGrid, route.useSearch());

	const page = gridPage(
		grid.appliedFilterModel,
		grid.paginationModel,
		grid.sortModel,
	);
	const { data, isLoading, isFetching, isError, error } =
		useQuery<AuditQueryData>({
			queryKey: queryKeys.audits.forPatronRequest(apiBase, patronRequestId, page),
			queryFn: async ({ signal }) =>
				request({
					url: `${apiBase}/graphql`,
					document: getAuditsByPatronRequest,
					variables: {
						query: processGridFilterModel(
							page.filterModel,
							`patronRequest:${patronRequestId}`,
							["briefDescription"],
						),
						pagesize: clampPageSize(page.pageSize),
						pageno: page.page ?? 0,
						order: page.sortField ?? "auditDate",
						orderBy: page.sortDirection?.toUpperCase() ?? "DESC",
					},
					requestHeaders: await authHeaders(),
					signal,
				}),
			placeholderData: (previousData) => previousData,
		});

	useDataGridErrorSafely(grid, isError, error);

	return (
		<DataGrid
			disablePivoting
			rows={data?.audits?.content ?? []}
			rowCount={data?.audits?.totalSize ?? 0}
			columns={auditColumns}
			columnVisibilityModel={grid.columnVisibilityModel}
			onColumnVisibilityModelChange={grid.handleColumnVisibilityChange}
			columnLayout={grid.columnLayout}
			type="audits"
			label={t("patron_request.audit_log")}
			identifier="AuditPatronRequestDetails"
			checkboxSelection={false}
			filterMode="server"
			filterModel={grid.filterModel}
			onFilterModelChange={grid.handleFilterChange}
			disableAggregation={true}
			disableHoverInteractions={true}
			disableRowGrouping={true}
			loading={isLoading || isFetching || grid.isFiltering}
			listViewEnabled={false}
			noResultsText={t("audit.no_results")}
			pagination
			paginationMode="server"
			paginationModel={grid.paginationModel}
			onPaginationModelChange={grid.handlePaginationChange}
			pivotingEnabled={false}
			toolbarVisible
			rowModesModel={{}}
			searchText={t("ui.data_grid.search_audits")}
			sortingMode="server"
			sortModel={grid.sortModel}
			onSortModelChange={grid.handleSortChange}
			views={grid.views}
		/>
	);
}
