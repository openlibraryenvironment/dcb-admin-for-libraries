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
import {
	LibrariesQueryData,
	ReferenceValueMappingsQueryData,
} from "@models/ReactQueryHelperTypes";
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
import { getLibrary } from "@queries/getLibrary";
import { getMappings } from "@queries/getMappings";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
// import dayjs from "dayjs";
import request from "graphql-request";
import { useCallback, useMemo, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "react-oidc-context";

export const Route = createFileRoute("/__authenticated/mappings")({
	component: RouteComponent,
});

interface UpdateMappingResponse {
	updateReferenceValueMapping: GridValidRowModel;
}

function RouteComponent() {
	const auth = useAuth();
	const { t } = useTranslation();
	const queryClient = useQueryClient();
	const { cfg } = useRouter().options.context as { cfg: any };
	const headers = useMemo(
		() => ({ Authorization: `Bearer ${auth.user?.access_token}` }),
		[auth.user?.access_token]
	);

	const gridId = "referenceValueMappings";
	const {
		sortModel: storedSortModel,
		filterModel: storedFilterModel,
		paginationModel: storedPaginationModel,
		columnVisibilityModel: storedColumnVisibilityModel,
		setSortModel,
		setFilterModel,
		setPaginationModel,
		setColumnVisibilityModel,
	} = useGridStore();

	const storedState = {
		sort: storedSortModel[gridId],
		filter: storedFilterModel[gridId],
		pagination: storedPaginationModel[gridId],
		columnVisibility: storedColumnVisibilityModel[gridId],
	};

	const [paginationModel, setLocalPaginationModel] =
		useState<GridPaginationModel>(
			storedState.pagination ?? { page: 0, pageSize: 25 }
		);
	const [filterModel, setLocalFilterModel] = useState<GridFilterModel>(
		storedState.filter ?? { items: [] }
	);
	const debouncedFilterModel = useDebounce(filterModel, 500);

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

	const handleSnackbarClose = (
		event?: React.SyntheticEvent | Event,
		reason?: string
	) => {
		if (reason === "clickaway") {
			return;
		}
		setSnackbarOpen(false);
	};

	// Add state to track if we're filtering
	const [isFiltering, setIsFiltering] = useState(false);

	const DCB_URL = cfg.VITE_DCB_API_BASE + "/graphql";
	const code = auth.user?.profile?.code;

	// Track when filter is being applied
	useEffect(() => {
		setIsFiltering(checkIfFiltering(filterModel, debouncedFilterModel));
	}, [filterModel, debouncedFilterModel]);

	// Library query
	const {
		data: librariesData,
		isLoading: librariesLoading,
		isError: librariesError,
	} = useQuery<LibrariesQueryData>({
		queryKey: ["libraryInfo", headers, code, DCB_URL],
		queryFn: async () =>
			request(
				DCB_URL,
				getLibrary,
				{
					query: "agencyCode:" + code,
					pagesize: 10,
					pageno: 0,
					orderBy: "fullName",
					order: "DESC",
				},
				headers
			),
	});
	const libraryHostLmsCode =
		librariesData?.libraries?.content?.[0]?.agency?.hostLms?.code;

	// If the DENY_LIBRARY_MAPPING_EDIT setting is not explicitly disabled, library users cannot edit their mappings.
	// As such, for editing to be enabled here, DENY_LIBRARY_MAPPING_EDIT must be disabled
	const editingEnabled =
		isFunctionalSettingEnabled(
			librariesData?.libraries?.content?.[0],
			"DENY_LIBRARY_MAPPING_EDIT"
		) == FunctionalSettingStatus.DISABLED;

	// Mappings query - using debounced filter model
	const {
		data: mappingsData,
		isLoading: mappingsLoading,
		isFetching,
		error,
		isError: mappingsError,
	} = useQuery<ReferenceValueMappingsQueryData>({
		queryKey: [
			gridId,
			libraryHostLmsCode,
			paginationModel,
			debouncedFilterModel, // Use debounced filter model
			sortModel,
			headers,
			DCB_URL,
			sortModel[0]?.field,
			sortModel[0]?.sort,
		],
		queryFn: async () => {
			const baseQuery = `(toContext:"${libraryHostLmsCode}" OR fromContext:${libraryHostLmsCode}) AND NOT deleted:true`;
			// Second Host LMS to come.
			const queryVariables = {
				query:
					processGridFilterModel(debouncedFilterModel, baseQuery, [
						"fromValue",
						"toValue",
						"fromCategory",
						"toCategory",
					]) ?? "",
				pagesize: paginationModel.pageSize ?? 200,
				pageno: paginationModel.page ?? 0,
				order: sortModel[0]?.field ?? "lastImported",
				orderBy: getSortOrderForServer(sortModel[0]?.sort) ?? "DESC",
			};
			return request(DCB_URL, getMappings, queryVariables, headers);
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
		mutationFn: (variables: { input: any }) =>
			request(
				cfg.VITE_DCB_API_BASE + "/graphql",
				updateReferenceValueMapping,
				variables,
				headers
			),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [gridId] });
		},
		onError: (error) => {
			// Set alerts
			// Catch "Library mapping editing has been disabled by your consortium administrator" too just in case
			console.log(error);
		},
	});

	const { mutate: deleteMapping } = useMutation({
		mutationFn: (idToDelete: GridRowId) =>
			request(
				cfg.VITE_DCB_API_BASE + "/graphql",
				deleteReferenceValueMapping,
				{ id: idToDelete },
				headers
			),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [gridId] });
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

	const handleEditClick = (id: GridRowId) => () => {
		setRowModesModel({ ...rowModesModel, [id]: { mode: GridRowModes.Edit } });
	};

	const handleSaveClick = (id: GridRowId) => () => {
		setRowModesModel({ ...rowModesModel, [id]: { mode: GridRowModes.View } });
	};

	const handleCancelClick = (id: GridRowId) => () => {
		setRowModesModel({
			...rowModesModel,
			[id]: { mode: GridRowModes.View, ignoreModifications: true },
		});
	};

	const handleDeleteClick = (id: GridRowId) => () => {
		setDeleteConfirmationId(id);
	};

	const handleConfirmDelete = () => {
		if (deleteConfirmationId) {
			deleteMapping(deleteConfirmationId);
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
				setEditRecord(changes);
				setPromiseArguments({ resolve, reject, newRow, oldRow });
			}),
		[]
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
			const result = await updateMapping({ input });
			resolve(result.updateReferenceValueMapping);
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
				headerName: "Actions",
				width: 100,
				cellClassName: "actions",
				getActions: ({ id }) => {
					const isInEditMode = rowModesModel[id]?.mode === GridRowModes.Edit;
					if (isInEditMode) {
						return [
							<GridActionsCellItem
								key="save"
								icon={<Save />}
								label="Save"
								onClick={handleSaveClick(id)}
							/>,
							<GridActionsCellItem
								key="cancel"
								icon={<Cancel />}
								label="Cancel"
								onClick={handleCancelClick(id)}
							/>,
						];
					}
					return [
						<>
							<GridActionsCellItem
								key="edit"
								icon={<Edit />}
								label="Edit"
								onClick={handleEditClick(id)}
								disabled={!editingEnabled}
							/>

							<GridActionsCellItem
								key="delete"
								icon={<Delete />}
								label="Delete"
								onClick={handleDeleteClick(id)}
							/>
						</>,
					];
				},
			},
		],
		[rowModesModel]
	);

	const refValueColumns = editingEnabled
		? [...standardRefValueMappingColumns, ...actionsColumn]
		: standardRefValueMappingColumns;

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

	if (mappingsError) {
		console.log(error, mappingsError, librariesError);
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
			{
				<DataGrid
					disablePivoting
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
					checkboxSelection={false}
					disableAggregation
					disableHoverInteractions
					disableRowGrouping
					listViewEnabled={false}
					pivotingEnabled={false}
					pagination
					toolbarVisible
					noResultsText={t("audit.no_results")}
					searchText="Search by mappings"
					scrollbarVisible={false}
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
			{
				<TimedAlert
					open={snackbarOpen}
					onCloseFunc={handleSnackbarClose}
					severityType="warning"
					// variant="filled"
					// sx={{ width: "100%" }}
					autoHideDuration={6000}
					alertText={
						t("ui.feedback.error.cannot_process") ||
						"We could not process that operation, so we have reset the data grid options."
					}></TimedAlert>
			}
		</>
	);
}
