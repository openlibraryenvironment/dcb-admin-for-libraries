import { getRouteApi, useRouter } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import DataGrid from "@components/DataGrid/DataGrid";
import { useSyncedDataGrid } from "@/hooks/useSyncedDataGrid";
import { usePatronRequestQueries } from "@/hooks/usePatronRequestQueries";
import { useDataGridErrorSafely } from "@/hooks/useDataGridErrorSafely";
import { recordHistoryGrid } from "@helpers/dataGrid/gridDefinitions";

const route = getRouteApi("/__authenticated/requesting/$recordId/history/");

export default function ClusterHistory() {
	const { recordId } = route.useParams();
	const { t } = useTranslation();
	const { cfg } = useRouter().options.context as { cfg: any };

	const grid = useSyncedDataGrid(recordHistoryGrid, route.useSearch());

	const query = usePatronRequestQueries({
		apiBase: cfg?.VITE_DCB_API_BASE,
		filterModel: grid.appliedFilterModel,
		paginationModel: grid.paginationModel,
		sortModel: grid.sortModel,
		mode: "borrowing",
		additionalQuery: `(bibClusterId:${recordId})`,
	});

	useDataGridErrorSafely(grid, query.isError, query.error);

	return (
		<DataGrid
			paginationModel={grid.paginationModel}
			onPaginationModelChange={grid.handlePaginationChange}
			filterModel={grid.filterModel}
			onFilterModelChange={grid.handleFilterChange}
			sortModel={grid.sortModel}
			onSortModelChange={grid.handleSortChange}
			views={grid.views}
			rows={query.rows}
			rowCount={query.rowCount}
			columns={query.columns}
			columnVisibilityModel={grid.columnVisibilityModel}
			onColumnVisibilityModelChange={grid.handleColumnVisibilityChange}
			columnLayout={grid.columnLayout}
			loading={query.isLoading || grid.isFiltering}
			type="patronRequests"
			label={t("requesting.history_label")}
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
			toolbarVisible={true}
			searchText={t("ui.actions.search")}
		/>
	);
}
