import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import DataGrid from "@components/DataGrid/DataGrid";
import { useSyncedDataGrid } from "@/hooks/useSyncedDataGrid";
import { usePatronRequestQueries } from "@/hooks/usePatronRequestQueries";
import { useDataGridErrorSafely } from "@/hooks/useDataGridErrorSafely";
import { defaultPatronRequestColumnVisibility } from "@helpers/dataGrid/columnVisibility/patronRequestColumnVisibility";

export const Route = createFileRoute(
	"/__authenticated/requesting/$recordId/history/",
)({
	component: HistoryPage,
});

function HistoryPage() {
	const { recordId } = Route.useParams();
	const { t } = useTranslation();
	const { cfg } = useRouter().options.context as { cfg: any };

	const grid = useSyncedDataGrid({
		gridId: `history_${recordId}`, // Evaluate impact of this: it might be useful to have it separate between records like this
		defaultSort: [{ field: "dateCreated", sort: "desc" }],
		defaultColumnVisibility: defaultPatronRequestColumnVisibility,
		defaultPagination: { page: 0, pageSize: 100 },
	});

	const query = usePatronRequestQueries({
		apiBase: cfg?.VITE_DCB_API_BASE,
		filterModel: grid.debouncedFilterModel,
		paginationModel: grid.paginationModel,
		sortModel: grid.sortModel,
		mode: "borrowing",
		additionalQuery: `(bibClusterId:${recordId})`,
	});

	useDataGridErrorSafely(
		`history_${recordId}`,
		query.isError,
		query.error,
		grid.setLocalFilterModel,
		grid.setLocalSortModel,
	);

	return (
		<DataGrid
			paginationModel={grid.paginationModel}
			onPaginationModelChange={grid.handlePaginationChange}
			filterModel={grid.filterModel}
			onFilterModelChange={grid.handleFilterChange}
			sortModel={grid.sortModel}
			onSortModelChange={grid.handleSortChange}
			rows={query.rows}
			rowCount={query.rowCount}
			columns={query.columns}
			columnVisibilityModel={
				grid.columnVisibilityModel ?? defaultPatronRequestColumnVisibility
			}
			loading={query.isLoading || grid.isFiltering}
			type="patronRequests"
			identifier="patronRequestsHistory"
			paginationMode="server"
			filterMode="server"
			sortingMode="server"
			noResultsText={t("requesting.no_history")}
			pivotingEnabled={false}
			checkboxSelection={false}
			disableAggregation
			disablePivoting
			disableRowGrouping
			disableHoverInteractions
			pagination
			listViewEnabled={false}
			rowModesModel={{}}
			scrollbarVisible={false}
			toolbarVisible={true}
			searchText={t("ui.actions.search")}
		/>
	);
}
