import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "react-oidc-context";
import { useQuery } from "@tanstack/react-query";
import request from "graphql-request";
import DataGrid from "@components/DataGrid/DataGrid";
import { clampPageSize } from "@constants/dataGrid/pagination";
import { auditColumns } from "@helpers/dataGrid/columns/auditColumns";
import { processGridFilterModel } from "@helpers/dataGrid/utilities";
import { AuditQueryData } from "@models/ReactQueryHelperTypes";
import { getAuditsByPatronRequest } from "@queries/getAuditByPatronRequest";
import { useDataGridErrorSafely } from "@/hooks/useDataGridErrorSafely";
import { useSyncedDataGrid } from "@/hooks/useSyncedDataGrid";

// One id for every request's audit log: keyed per request, the persisted grid
// state grew by one entry for every request a user ever opened.
const AUDIT_GRID = "patronRequestAuditLog";

interface PatronRequestAuditLogProps {
	apiBase: string;
	patronRequestId: string;
}

export default function PatronRequestAuditLog({
	apiBase,
	patronRequestId,
}: PatronRequestAuditLogProps) {
	const { t } = useTranslation();
	const auth = useAuth();
	const headers = useMemo(
		() => ({ Authorization: `Bearer ${auth.user?.access_token}` }),
		[auth.user?.access_token],
	);

	const grid = useSyncedDataGrid({
		gridId: AUDIT_GRID,
		defaultSort: [{ field: "auditDate", sort: "desc" }],
		defaultColumnVisibility: {},
		defaultPagination: { page: 0, pageSize: 25 },
	});

	const { data, isLoading, isFetching, isError, error } =
		useQuery<AuditQueryData>({
			queryKey: [
				"patronRequestAuditLog",
				patronRequestId,
				grid.debouncedFilterModel,
				grid.paginationModel.pageSize,
				grid.paginationModel.page,
				grid.sortModel[0]?.field,
				grid.sortModel[0]?.sort,
				headers,
				apiBase,
			],
			queryFn: async () =>
				request(
					`${apiBase}/graphql`,
					getAuditsByPatronRequest,
					{
						query: processGridFilterModel(
							grid.debouncedFilterModel,
							`patronRequest:${patronRequestId}`,
							["briefDescription"],
						),
						pagesize: clampPageSize(grid.paginationModel.pageSize),
						pageno: grid.paginationModel.page ?? 0,
						order: grid.sortModel[0]?.field ?? "auditDate",
						orderBy: grid.sortModel[0]?.sort?.toUpperCase() ?? "DESC",
					},
					headers,
				),
			placeholderData: (previousData) => previousData,
		});

	useDataGridErrorSafely(
		AUDIT_GRID,
		isError,
		error,
		grid.setLocalFilterModel,
		grid.setLocalSortModel,
	);

	return (
		<DataGrid
			disablePivoting
			rows={data?.audits?.content ?? []}
			rowCount={data?.audits?.totalSize ?? 0}
			columns={auditColumns}
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
		/>
	);
}
