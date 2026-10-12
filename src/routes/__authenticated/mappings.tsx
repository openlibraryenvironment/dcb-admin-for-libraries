import { clampPageSize } from "@constants/dataGrid/pagination";
import { pageTitle } from "@helpers/pageTitle";
import Typography from "@mui/material/Typography";
import { useDataGridErrorSafely } from "@/hooks/useDataGridErrorSafely";
import { useGridStore } from "@/hooks/useDataGridStore";
import { useDebounce } from "@/hooks/useDebounce";
import Confirmation from "@components/Confirmation/Confirmation";
import DataGrid from "@components/DataGrid/DataGrid";
import Error from "@components/Error/Error";
import Loading from "@components/Loading/Loading";
import TimedAlert from "@components/TimedAlert/TimedAlert";
import { standardRefValueMappingColumns } from "@helpers/dataGrid/columns/referenceValueMappingColumns";
import { referenceValueMappingColumnVisibility } from "@helpers/dataGrid/columnVisibility/referenceValueMappingColumnVisibilityModel";
import { computeMutation } from "@helpers/dataGrid/computeMutation";
import {
	getSortOrderForServer,
	checkIfFiltering,
	processGridFilterModel,
} from "@helpers/dataGrid/utilities";
import { isFunctionalSettingEnabled } from "@helpers/findFunctionalSetting";
import { FunctionalSettingStatus } from "@models/FunctionalSetting";
import { ReferenceValueMappingsQueryData } from "@models/ReactQueryHelperTypes";
import { Cancel, Delete, Edit, Save } from "@mui/icons-material";
import {
	GridActionsCellItem,
	GridColDef,
	GridColumnVisibilityModel,
	GridFilterModel,
	GridPaginationModel,
	GridRowId,
	GridRowModel,
	GridRowModes,
	GridRowModesModel,
	GridSortModel,
	GridValidRowModel,
} from "@mui/x-data-grid-premium";
import { deleteReferenceValueMapping } from "@mutations/deleteReferenceValueMapping";
import { updateReferenceValueMapping } from "@mutations/updateReferenceValueMapping";
import { gridPage, queryKeys } from "@helpers/queryKeys";
import { authHeaders } from "@helpers/auth";
import { libraryQueryOptions } from "@helpers/sharedQueries";
import { getMappings } from "@queries/getMappings";
import { UserFacingError, userFacingReason } from "@helpers/userFacingReason";
import { useAnnounce } from "@/hooks/useAnnouncer";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import request from "graphql-request";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAgencyCodes } from "@/hooks/useAgencyCodes";

export const Route = createFileRoute("/__authenticated/mappings")({
	head: () => ({ meta: [{ title: pageTitle("nav.mappings.title") }] }),
	component: RouteComponent,
});

interface UpdateMappingResponse {
	updateReferenceValueMapping: GridValidRowModel;
}

interface DeleteMappingInput {
	id: GridRowId;
	reason: string;
	changeCategory: string;
	changeReferenceUrl: string;
}

interface DeleteMappingResponse {
	deleteReferenceValueMapping: { success: boolean; message: string | null };
}

function RouteComponent() {
	const { t } = useTranslation();
	const queryClient = useQueryClient();
	const { cfg } = useRouter().options.context as { cfg: any };

	const gridId = "referenceValueMappings";
	const storedState = {
		sort: useGridStore((state) => state.sortModel[gridId]),
		filter: useGridStore((state) => state.filterModel[gridId]),
		pagination: useGridStore((state) => state.paginationModel[gridId]),
		columnVisibility: useGridStore(
			(state) => state.columnVisibilityModel[gridId],
		),
	};
	const setSortModel = useGridStore((state) => state.setSortModel);
	const setFilterModel = useGridStore((state) => state.setFilterModel);
	const setPaginationModel = useGridStore((state) => state.setPaginationModel);
	const setColumnVisibilityModel = useGridStore(
		(state) => state.setColumnVisibilityModel,
	);

	const [paginationModel, setLocalPaginationModel] =
		useState<GridPaginationModel>(
			storedState.pagination ?? { page: 0, pageSize: 25 }
		);
	const [filterModel, setLocalFilterModel] = useState<GridFilterModel>(
		storedState.filter ?? { items: [] }
	);
	const debouncedFilterModel = useDebounce(filterModel, 500);
	const isFiltering = checkIfFiltering(filterModel, debouncedFilterModel);

	const [sortModel, setLocalSortModel] = useState<GridSortModel>(
		storedState.sort ?? [{ field: "lastImported", sort: "desc" }]
	);
	const [rowModesModel, setRowModesModel] = useState<GridRowModesModel>({});
	const [promiseArguments, setPromiseArguments] = useState<any>(null);
	const [editRecord, setEditRecord] = useState<string | null>(null);
	const [deleteConfirmationId, setDeleteConfirmationId] =
		useState<GridRowId | null>(null);
	const [columnVisibilityModel, setLocalColumnVisibilityModel] = useState(
		storedState.columnVisibility ?? referenceValueMappingColumnVisibility
	);
	const [snackbarOpen, setSnackbarOpen] = useState(false);
	// An edit or a deletion that did not save. The grid used to build this message
	// and throw it away, so a failed save reverted the row and said nothing.
	const [rowUpdateError, setRowUpdateError] = useState<string | null>(null);

	const handleSnackbarClose = (
		event?: React.SyntheticEvent | Event,
		reason?: string
	) => {
		if (reason === "clickaway") {
			return;
		}
		setSnackbarOpen(false);
	};

	const apiBase = cfg.VITE_DCB_API_BASE;
	const DCB_URL = apiBase + "/graphql";
	const { agencyCode: code } = useAgencyCodes();

	const {
		data: librariesData,
		isLoading: librariesLoading,
		isError: librariesError,
	} = useQuery(libraryQueryOptions(apiBase, code ?? ""));
	const libraryHostLmsCode =
		librariesData?.libraries?.content?.[0]?.agency?.hostLms?.code ?? "";

	// If the DENY_LIBRARY_MAPPING_EDIT setting is not explicitly disabled, library users cannot edit their mappings.
	// As such, for editing to be enabled here, DENY_LIBRARY_MAPPING_EDIT must be disabled
	const editingEnabled =
		isFunctionalSettingEnabled(
			librariesData?.libraries?.content?.[0],
			"DENY_LIBRARY_MAPPING_EDIT"
		) == FunctionalSettingStatus.DISABLED;

	const grid = gridPage(debouncedFilterModel, paginationModel, sortModel);
	const {
		data: mappingsData,
		isLoading: mappingsLoading,
		isFetching,
		error,
		isError: mappingsError,
	} = useQuery<ReferenceValueMappingsQueryData>({
		queryKey: queryKeys.mappings.list(apiBase, libraryHostLmsCode, grid),
		queryFn: async () => {
			const baseQuery = `(toContext:"${libraryHostLmsCode}" OR fromContext:${libraryHostLmsCode}) AND NOT deleted:true`;
			// Second Host LMS to come.
			const queryVariables = {
				query:
					processGridFilterModel(grid.filterModel, baseQuery, [
						"fromValue",
						"toValue",
						"fromCategory",
						"toCategory",
					]) ?? "",
				pagesize: clampPageSize(grid.pageSize),
				pageno: grid.page ?? 0,
				order: grid.sortField ?? "lastImported",
				orderBy: getSortOrderForServer(grid.sortDirection) ?? "DESC",
			};
			return request(
				apiBase + "/graphql",
				getMappings,
				queryVariables,
				await authHeaders()
			);
		},
		enabled: !!libraryHostLmsCode,
		refetchOnWindowFocus: true,
		refetchIntervalInBackground: false,
		// Keep previous data while new data is loading
		placeholderData: (previousData) => previousData,
	});

	const { mutateAsync: updateMapping } = useMutation<
		UpdateMappingResponse,
		Error,
		{ input: any }
	>({
		mutationFn: async (variables: { input: any }) =>
			request(
				DCB_URL,
				updateReferenceValueMapping,
				variables,
				await authHeaders()
			),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.mappings.forHostLms(apiBase, libraryHostLmsCode),
			});
		},
	});

	const announce = useAnnounce();
	const { mutate: deleteMapping } = useMutation<
		DeleteMappingResponse,
		unknown,
		DeleteMappingInput
	>({
		mutationFn: async (input) => {
			const result = await request<DeleteMappingResponse>(
				DCB_URL,
				deleteReferenceValueMapping,
				{ input },
				await authHeaders()
			);
			// A refusal can come back as success:false with a 200, not only as an error.
			if (!result.deleteReferenceValueMapping?.success) {
				throw new UserFacingError(result.deleteReferenceValueMapping?.message);
			}
			return result;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.mappings.forHostLms(apiBase, libraryHostLmsCode),
			});
			announce(t("mappings.deleted"));
		},
		onError: (error) => {
			const reason = userFacingReason(error);
			setRowUpdateError(
				reason
					? t("mappings.delete_failed_reason", { reason })
					: t("mappings.delete_failed")
			);
		},
	});

	const handlePaginationChange = useCallback(
		(model: GridPaginationModel) => {
			setLocalPaginationModel(model);
			setPaginationModel(gridId, model);
		},
		[gridId, setPaginationModel]
	);

	const handleFilterChange = useCallback(
		(model: GridFilterModel) => {
			setLocalFilterModel(model);
			setFilterModel(gridId, model);
		},
		[gridId, setFilterModel]
	);

	const handleSortChange = useCallback(
		(model: GridSortModel) => {
			setLocalSortModel(model);
			setSortModel(gridId, model);
		},
		[gridId, setSortModel]
	);

	const handleColumnVisibilityChange = useCallback(
		(model: GridColumnVisibilityModel) => {
			setLocalColumnVisibilityModel(model);
			setColumnVisibilityModel(gridId, model);
		},
		[gridId, setColumnVisibilityModel]
	);

	const handleEditClick = useCallback(
		(id: GridRowId) => () => {
			setRowModesModel({ ...rowModesModel, [id]: { mode: GridRowModes.Edit } });
		},
		[rowModesModel]
	);

	const handleSaveClick = useCallback(
		(id: GridRowId) => () => {
			setRowModesModel({ ...rowModesModel, [id]: { mode: GridRowModes.View } });
		},
		[rowModesModel]
	);

	const handleCancelClick = useCallback(
		(id: GridRowId) => () => {
			setRowModesModel({
				...rowModesModel,
				[id]: { mode: GridRowModes.View, ignoreModifications: true },
			});
		},
		[rowModesModel]
	);

	const handleDeleteClick = (id: GridRowId) => () => {
		setDeleteConfirmationId(id);
	};

	const handleConfirmDelete = (
		reason: string,
		changeCategory: string,
		changeReferenceUrl: string
	) => {
		if (deleteConfirmationId) {
			deleteMapping({
				id: deleteConfirmationId,
				reason,
				changeCategory,
				changeReferenceUrl,
			});
			setDeleteConfirmationId(null);
		}
	};

	const processRowUpdate = useCallback(
		(newRow: GridRowModel, oldRow: GridRowModel) =>
			new Promise<GridRowModel>((resolve, reject) => {
				const changes = computeMutation(newRow, oldRow);
				if (!changes) {
					resolve(oldRow);
					return;
				}
				const blank = standardRefValueMappingColumns.find(
					(column) =>
						column.editable &&
						newRow[column.field] !== oldRow[column.field] &&
						String(newRow[column.field] ?? "").trim() === ""
				);
				if (blank) {
					reject(
						new UserFacingError(
							t("mappings.value_required", { field: blank.headerName })
						)
					);
					return;
				}
				setEditRecord(changes);
				setPromiseArguments({ resolve, reject, newRow, oldRow });
			}),
		[t]
	);

	const handleRowUpdateError = useCallback(
		(error: unknown) => {
			const reason = userFacingReason(error);
			setRowUpdateError(
				reason
					? t("mappings.update_failed_reason", { reason })
					: t("mappings.update_failed")
			);
		},
		[t]
	);

	const handleModalConfirm = async (
		reason: string,
		changeCategory: string,
		changeReferenceUrl: string
	) => {
		if (!promiseArguments) return;
		const { resolve, reject, newRow, oldRow } = promiseArguments;

		const input: Record<string, any> = {
			id: newRow.id,
			reason,
			changeCategory,
			changeReferenceUrl,
		};
		Object.keys(newRow).forEach((key) => {
			if (newRow[key] !== oldRow[key]) {
				input[key] = newRow[key];
			}
		});

		try {
			await updateMapping({ input });
			// The mutation returns only id and toValue; resolving with that would
			// blank every other cell of the row until the refetch lands.
			resolve(newRow);
		} catch (error) {
			reject(error);
		} finally {
			setPromiseArguments(null);
			setEditRecord(null);
		}
	};

	const handleModalCancel = () => {
		if (!promiseArguments) return;
		const { oldRow, resolve } = promiseArguments;
		resolve(oldRow);
		setPromiseArguments(null);
		setEditRecord(null);
	};

	const actionsColumn: GridColDef[] = useMemo(
		() => [
			{
				field: "actions",
				type: "actions",
				headerName: t("ui.actions.title"),
				width: 100,
				cellClassName: "actions",
				getActions: ({ id }) => {
					const isInEditMode = rowModesModel[id]?.mode === GridRowModes.Edit;
					if (isInEditMode) {
						return [
							<GridActionsCellItem
								key="save"
								icon={<Save />}
								label={t("ui.actions.save")}
								onClick={handleSaveClick(id)}
							/>,
							<GridActionsCellItem
								key="cancel"
								icon={<Cancel />}
								label={t("ui.actions.cancel")}
								onClick={handleCancelClick(id)}
							/>,
						];
					}
					// One element PER action, not a fragment wrapping both: the grid
					// inspects each returned element (for showInMenu, among others),
					// and a fragment hides them from it.
					return [
						<GridActionsCellItem
							key="edit"
							icon={<Edit />}
							label={t("ui.actions.edit")}
							onClick={handleEditClick(id)}
							disabled={!editingEnabled}
						/>,
						<GridActionsCellItem
							key="delete"
							icon={<Delete />}
							label={t("ui.actions.delete")}
							onClick={handleDeleteClick(id)}
						/>,
					];
				},
			},
		],
		// editingEnabled belongs here: it is false while the library query is in
		// flight, and without the dependency the memo froze that first value - so a
		// library the consortium DOES permit to edit got a permanently disabled Edit
		// action. Caught by e2e/mappings.spec.ts.
		[
			rowModesModel,
			editingEnabled,
			handleEditClick,
			handleSaveClick,
			handleCancelClick,
			t,
		]
	);

	// Without editing, the cells must not be editable either: Enter or typing on a
	// focused cell starts row editing whether or not there is an Edit button.
	const refValueColumns = useMemo(
		() =>
			editingEnabled
				? [...standardRefValueMappingColumns, ...actionsColumn]
				: standardRefValueMappingColumns.map((column) => ({
						...column,
						editable: false,
					})),
		[editingEnabled, actionsColumn]
	);

	useDataGridErrorSafely(
		gridId,
		mappingsError,
		error,
		setLocalFilterModel,
		setLocalSortModel,
		() => setSnackbarOpen(true)
	);
	// Show loading if initial load or libraries are loading
	if ((mappingsLoading && !mappingsData) || librariesLoading) {
		return (
			<Loading
				title={t("ui.info.loading.document", {
					document_type: t("nav.mappings.reference").toLowerCase(),
				})}
				subtitle={t("ui.info.wait")}
			/>
		);
	}

	if (mappingsError || librariesError) {
		return (
			<Error
				title={t("ui.feedback.error.loading", {
					entity: t("nav.mappings.reference").toLowerCase(),
				})}
				message={t("ui.info.connection_issue")}
				description={t("ui.info.try_later")}
				action={t("ui.actions.go_back")}
				goBack="/"
			/>
		);
	}

	// Determine if we should show loading state
	const shouldShowLoading =
		isFiltering || mappingsLoading || (isFetching && !!mappingsData);

	return (
		<>
			<Typography variant="h1">{t("nav.mappings.title")}</Typography>
			{
				<DataGrid
					disablePivoting
					label={t("nav.mappings.title")}
					identifier={gridId}
					type="referenceValueMappings"
					columns={refValueColumns}
					rows={mappingsData?.referenceValueMappings?.content ?? []}
					rowCount={mappingsData?.referenceValueMappings?.totalSize ?? 0}
					loading={shouldShowLoading} // Show loading when filtering or fetching
					paginationMode="server"
					paginationModel={paginationModel}
					onPaginationModelChange={handlePaginationChange}
					filterMode="server"
					filterModel={filterModel} // Use immediate filter model for UI
					onFilterModelChange={handleFilterChange}
					sortingMode="server"
					sortModel={sortModel}
					onSortModelChange={handleSortChange}
					columnVisibilityModel={columnVisibilityModel}
					onColumnVisibilityModelChange={handleColumnVisibilityChange}
					editMode="row"
					rowModesModel={rowModesModel}
					onRowModesModelChange={setRowModesModel}
					processRowUpdate={processRowUpdate}
					onRowUpdateError={handleRowUpdateError}
					checkboxSelection={false}
					disableAggregation
					disableHoverInteractions
					disableRowGrouping
					listViewEnabled={false}
					pivotingEnabled={false}
					pagination
					toolbarVisible
					noResultsText={t("audit.no_results")}
					searchText={t("ui.data_grid.search_mappings")}
				/>
			}
			{
				<Confirmation
					open={!!promiseArguments}
					onClose={handleModalCancel}
					onConfirm={handleModalConfirm}
					gridEdit={true}
					entityName="ReferenceValueMapping"
					action="gridEdit"
					editInformation={editRecord}
				/>
			}
			{
				<Confirmation
					open={!!deleteConfirmationId}
					onClose={() => setDeleteConfirmationId(null)}
					onConfirm={handleConfirmDelete}
					gridEdit={false}
					entityName="ReferenceValueMapping"
					action="deletion"
				/>
			}
			<TimedAlert
				open={rowUpdateError !== null}
				onCloseFunc={() => setRowUpdateError(null)}
				severityType="error"
				alertText={rowUpdateError ?? ""}
			/>
			{
				<TimedAlert
					open={snackbarOpen}
					onCloseFunc={handleSnackbarClose}
					severityType="warning"
					alertText={
						t("ui.feedback.error.cannot_process")
					}></TimedAlert>
			}
		</>
	);
}
