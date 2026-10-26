import { borrowedByLibraryQuery, hasBorrowingScope } from "@helpers/patronRequestScope";
import { validateGridSearch } from "@helpers/viewState/gridSearch";
import { pickupRequestsView } from "@helpers/viewState/gridViewIds";
import { clampPageSize } from "@constants/dataGrid/pagination";
import { pageTitle } from "@helpers/pageTitle";
import { isPickupRequestsEnabled } from "@helpers/featureFlags";
import {
	agencyLocationIdsQueryOptions,
	collectingHereQuery,
	MAX_PICKUP_LOCATIONS,
} from "@helpers/home";
import Typography from "@mui/material/Typography";
import { useDataGridErrorSafely } from "@/hooks/useDataGridErrorSafely";
import { useSyncedDataGrid } from "@/hooks/useSyncedDataGrid";
import { usePatronRequestExport } from "@/hooks/useExport";
import DataGrid from "@components/DataGrid/DataGrid";
import Error from "@components/Error/Error";
import Loading from "@components/Loading/Loading";
import TimedAlert from "@components/TimedAlert/TimedAlert";
import { pickupRequestsGrid } from "@helpers/dataGrid/gridDefinitions";
import { processGridFilterModel } from "@helpers/dataGrid/utilities";
import { hostLmsLibraryOptions } from "@helpers/hostLmsLibraryOptions";
import { PatronRequestQueryData } from "@models/ReactQueryHelperTypes";
import { GridColDef, GridRowModesModel, useGridApiRef } from "@mui/x-data-grid-premium";
import { gridPage, queryKeys } from "@helpers/queryKeys";
import { authHeaders } from "@helpers/auth";
import { libraryFilterOptionsQueryOptions } from "@helpers/sharedQueries";
import { getPatronRequests } from "@queries/getPatronRequests";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useRouter, redirect } from "@tanstack/react-router";
import request from "graphql-request";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAgencyCodes } from "@/hooks/useAgencyCodes";

export const Route = createFileRoute("/__authenticated/pickupRequests")({
	validateSearch: validateGridSearch,
	beforeLoad: async ({ search, location }) => {
		// The tab is hidden without it; the address is still typeable. docs/pickup-requests.md.
		if (!isPickupRequestsEnabled()) throw redirect({ to: "/" });
		// Loaded here, not with the route: the first load of every page would carry the codec
		const { privateFilterRedirect, rememberedViewRedirect } = await import(
			"@helpers/viewState/viewRoute"
		);
		const removed = privateFilterRedirect(pickupRequestsView, search, location.state);
		if (removed) throw redirect({ to: "/pickupRequests", ...removed });
		const restore = rememberedViewRedirect(pickupRequestsView, search, location.state);
		if (restore) throw redirect({ to: "/pickupRequests", ...restore });
	},
	head: () => ({ meta: [{ title: pageTitle("nav.pickup_requests.title") }] }),
	component: RouteComponent,
});

/** Other libraries' patrons' requests collected at this library's locations. docs/pickup-requests.md. */
function RouteComponent() {
	const { t } = useTranslation();
	const { cfg } = useRouter().options.context as { cfg: { VITE_DCB_API_BASE: string } };
	const dcbApiBase = cfg?.VITE_DCB_API_BASE;
	const apiRef = useGridApiRef();

	const grid = useSyncedDataGrid(pickupRequestsGrid, Route.useSearch());
	const [rowModesModel, setRowModesModel] = useState<GridRowModesModel>({});
	const [alert, setAlert] = useState<{
		open: boolean;
		severity: "success" | "error" | "warning";
		text: string | null;
	}>({ open: false, severity: "success", text: null });

	const { agencyCode: code } = useAgencyCodes();

	const { data: librariesData } = useQuery({
		...libraryFilterOptionsQueryOptions(dcbApiBase),
		enabled: !!dcbApiBase,
		refetchOnWindowFocus: false,
	});
	const libraries = useMemo(() => librariesData?.libraries?.content ?? [], [librariesData]);
	const hostLmsCode = libraries.find((library) => library.agencyCode === code)?.agency?.hostLms?.code;

	const locations = useQuery({
		...agencyLocationIdsQueryOptions(dcbApiBase, code ?? ""),
		enabled: !!dcbApiBase && !!code,
	});
	const locationIds = useMemo(() => locations.data ?? [], [locations.data]);
	const borrowedScope = borrowedByLibraryQuery(code, hostLmsCode);
	const presetQuery = collectingHereQuery(locationIds, borrowedScope);

	const page = gridPage(grid.appliedFilterModel, grid.paginationModel, grid.sortModel);

	const {
		data: patronRequestData,
		isError: isPatronRequestError,
		error,
		isFetching,
	} = useQuery<PatronRequestQueryData>({
		queryKey: queryKeys.pickupRequests.list(dcbApiBase, code ?? "", presetQuery, page),
		queryFn: async ({ signal }) =>
			request({
				url: `${dcbApiBase}/graphql`,
				document: getPatronRequests(),
				variables: {
					// Already scoped: processGridFilterModel puts the preset query first.
					query: processGridFilterModel(page.filterModel, presetQuery, ["status", "description"]),
					pagesize: clampPageSize(page.pageSize),
					pageno: page.page ?? 0,
					order: page.sortField ?? "dateCreated",
					orderBy: page.sortDirection?.toUpperCase() ?? "DESC",
				},
				requestHeaders: await authHeaders(),
				signal,
			}),
		enabled: !!dcbApiBase && !!code && locationIds.length > 0 && hasBorrowingScope(code, hostLmsCode),
		refetchOnWindowFocus: true,
		refetchIntervalInBackground: false,
		placeholderData: (previousData) => previousData,
	});

	const libraryHostLmsOptions = useMemo(() => hostLmsLibraryOptions(libraries), [libraries]);
	const columns = useMemo(
		() =>
			pickupRequestsGrid.columns.map((col): GridColDef =>
				col.field === "patronHostlmsCode"
					? { ...col, type: "singleSelect", valueOptions: libraryHostLmsOptions }
					: col,
			),
		[libraryHostLmsOptions],
	);

	useDataGridErrorSafely(grid, isPatronRequestError, error, () =>
		setAlert({ open: true, severity: "warning", text: t("ui.feedback.error.cannot_process") }),
	);

	const { exportProgress, exportConfig } = usePatronRequestExport({
		apiRef,
		dcbApiBase,
		baseQuery: presetQuery,
		filterModel: grid.appliedFilterModel,
		sortModel: grid.sortModel,
		onExportResult: (result) => setAlert({ open: true, ...result }),
		type: "pickupRequests",
	});

	if (locations.isError || isPatronRequestError) {
		return (
			<Error
				title={t("ui.feedback.error.cannot_retrieve_record")}
				message={t("ui.info.connection_issue")}
				description={t("ui.info.try_later")}
				action={t("ui.actions.go_back")}
				goBack="/"
			/>
		);
	}

	if (locations.isSuccess && locationIds.length === 0) {
		return (
			<>
				<Typography variant="h1">{t("nav.pickup_requests.title")}</Typography>
				<Typography>{t("pickup_requests.no_locations")}</Typography>
			</>
		);
	}

	if (!patronRequestData) {
		return (
			<Loading
				title={t("ui.info.loading.document", {
					document_type: t("nav.pickup_requests.title").toLowerCase(),
				})}
				subtitle={t("ui.info.wait")}
			/>
		);
	}

	return (
		<>
			<Typography variant="h1">{t("nav.pickup_requests.title")}</Typography>
			<Typography gutterBottom>{t("pickup_requests.description")}</Typography>
			{locationIds.length > MAX_PICKUP_LOCATIONS ? (
				<Typography gutterBottom>
					{t("pickup_requests.too_many_locations", { count: MAX_PICKUP_LOCATIONS })}
				</Typography>
			) : null}
			<DataGrid
				disablePivoting
				rows={patronRequestData.patronRequests?.content ?? []}
				columns={columns}
				columnVisibilityModel={grid.columnVisibilityModel}
				checkboxSelection={false}
				onColumnVisibilityModelChange={grid.handleColumnVisibilityChange}
				columnLayout={grid.columnLayout}
				type="patronRequests"
				label={t("nav.pickup_requests.title")}
				identifier="pickupPatronRequests"
				disableAggregation={true}
				disableHoverInteractions={true}
				disableRowGrouping={true}
				loading={grid.isFiltering || (isFetching && !!patronRequestData)}
				listViewEnabled={false}
				noResultsText={t("pickup_requests.none")}
				pagination
				pivotingEnabled={false}
				toolbarVisible
				searchText={t("ui.data_grid.search_pickup_requests")}
				paginationMode="server"
				paginationModel={grid.paginationModel}
				onPaginationModelChange={grid.handlePaginationChange}
				filterMode="server"
				filterModel={grid.filterModel}
				onFilterModelChange={grid.handleFilterChange}
				sortingMode="server"
				sortModel={grid.sortModel}
				onSortModelChange={grid.handleSortChange}
				views={grid.views}
				rowCount={patronRequestData.patronRequests?.totalSize ?? 0}
				rowModesModel={rowModesModel}
				onRowModesModelChange={setRowModesModel}
				exportConfig={exportConfig}
				isExporting={exportProgress.isExporting}
				parentApiRef={apiRef}
			/>
			<TimedAlert
				open={alert.open}
				onCloseFunc={() => setAlert({ open: false, severity: "success", text: null })}
				severityType={alert.severity}
				alertText={alert.text}
			/>
		</>
	);
}
