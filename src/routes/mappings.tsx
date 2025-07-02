import { useGridStore } from "@/hooks/useDataGridStore2";
import Confirmation from "@components/Confirmation/Confirmation";
import DataGrid from "@components/DataGrid/DataGrid";
import Loading from "@components/Loading/Loading";
import { standardFilters } from "@constants/filters/filters";
import { buildFilterQuery } from "@helpers/dataGrid/buildFilterQuery";
import { computeMutation } from "@helpers/dataGrid/computeMutation";
// import { validateRow } from "@helpers/dataGrid/validateRow";
import {
	LibrariesQueryData,
	ReferenceValueMappingsQueryData,
} from "@models/ReactQueryHelperTypes";
import { Cancel, Delete, Edit, Save } from "@mui/icons-material";
import {
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	Button,
} from "@mui/material";
import {
	GridActionsCellItem,
	GridColDef,
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
import dayjs from "dayjs";
import request from "graphql-request";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "react-oidc-context";

export const Route = createFileRoute("/mappings")({
	component: RouteComponent,
});
interface UpdateMappingResponse {
	updateReferenceValueMapping: GridValidRowModel;
}
const processMuiFilterModel = (
	model: GridFilterModel,
	baseQuery: string
): string => {
	const { items, logicOperator = "AND", quickFilterValues = [] } = model;

	const columnFilterQueries = items
		.map((item) => buildFilterQuery(item.field, item.operator, item.value))
		.filter(Boolean);

	let finalQuery = "";
	if (columnFilterQueries.length > 0) {
		finalQuery = `(${columnFilterQueries.join(` ${logicOperator.toUpperCase()} `)})`;
	}

	if (quickFilterValues.length > 0) {
		const quickFilterQuery = quickFilterValues
			.map(
				(val) =>
					`(fromValue:*${val}* OR toValue:*${val}* OR fromCategory:*${val}* OR toCategory:*${val}*)`
			)
			.join(" AND ");

		if (finalQuery) {
			finalQuery += ` AND (${quickFilterQuery})`;
		} else {
			finalQuery = quickFilterQuery;
		}
	}

	if (baseQuery) {
		return finalQuery ? `${baseQuery} AND (${finalQuery})` : baseQuery;
	}
	return finalQuery;
};

function RouteComponent() {
	const auth = useAuth();
	const { t } = useTranslation();
	const queryClient = useQueryClient();
	const { cfg } = useRouter().options.context as { cfg: any };
	const id = auth.user?.profile?.libraryId;
	const headers = useMemo(
		() => ({ Authorization: `Bearer ${auth.user?.access_token}` }),
		[auth.user?.access_token]
	);

	const gridId = "referenceValueMappings";
	const {
		sortModel: storedSortModel,
		filterModel: storedFilterModel,
		paginationModel: storedPaginationModel,
		setSortModel,
		setFilterModel,
		setPaginationModel,
	} = useGridStore();

	const storedState = {
		sort: storedSortModel[gridId],
		filter: storedFilterModel[gridId],
		pagination: storedPaginationModel[gridId],
	};

	const [paginationModel, setLocalPaginationModel] =
		useState<GridPaginationModel>(
			storedState.pagination ?? { page: 0, pageSize: 20 }
		);
	const [filterModel, setLocalFilterModel] = useState<GridFilterModel>(
		storedState.filter ?? { items: [] }
	);
	const [sortModel, setLocalSortModel] = useState<GridSortModel>(
		storedState.sort ?? [{ field: "lastImported", sort: "desc" }]
	);
	const [rowModesModel, setRowModesModel] = useState<GridRowModesModel>({});
	const [promiseArguments, setPromiseArguments] = useState<any>(null);
	const [editRecord, setEditRecord] = useState<string | null>(null);
	const [deleteConfirmationId, setDeleteConfirmationId] =
		useState<GridRowId | null>(null);
	const DCB_URL = cfg.VITE_DCB_API_BASE + "/graphql";
	const code = auth.user?.profile?.code;

	// Find a way for this not to be needed twice
	const {
		data: librariesData,
		isLoading: librariesLoading,
		isError: librariesError,
	} = useQuery<LibrariesQueryData>({
		queryKey: ["libraryInfo", id, headers, code, DCB_URL],
		queryFn: async () =>
			request(
				DCB_URL,
				getLibrary,
				{
					query: code ? "agencyCode:" + code : "id:" + id, // Prefer to use the full name, but fall back to the ID if needed
					pagesize: 10,
					pageno: 0,
					orderBy: "fullName",
					order: "DESC",
				},
				headers
			),
		// do the on success here
	});
	const libraryHostLmsCode =
		librariesData?.libraries?.content?.[0]?.agency?.hostLms?.code;

	const { data: mappingsData, isLoading: mappingsLoading } =
		useQuery<ReferenceValueMappingsQueryData>({
			queryKey: [
				gridId,
				libraryHostLmsCode,
				paginationModel,
				filterModel,
				sortModel,
				headers,
				DCB_URL,
				sortModel[0]?.field,
			],
			queryFn: async () => {
				const baseQuery = `fromContext:${libraryHostLmsCode} OR toContext:${libraryHostLmsCode}`;
				const queryVariables = {
					query: processMuiFilterModel(filterModel, baseQuery) ?? "",
					pagesize: paginationModel.pageSize ?? 200,
					pageno: paginationModel.page ?? 0,
					order: sortModel[0]?.field ?? "lastImported",
					orderBy: sortModel[0]?.sort?.toUpperCase() ?? "DESC",
				};
				return request(DCB_URL, getMappings, queryVariables, headers);
			},
			enabled: !!libraryHostLmsCode,
		});

	const { mutateAsync: updateMapping } = useMutation<
		UpdateMappingResponse, // ✅ Type for successful data
		Error, // Type for the error
		{ input: any } // Type for the variables
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
				// const validationError = validateRow(
				// 	newRow as GridValidRowModel,
				// 	oldRow as GridValidRowModel
				// );
				// if (validationError) {
				// 	reject(new Error(validationError.translationKey));
				// 	return;
				// }
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

	const standardRefValueMappingColumns: GridColDef[] = useMemo(
		() => [
			{
				field: "fromCategory",
				headerName: "Category",
				minWidth: 50,
				flex: 0.5,
				filterOperators: standardFilters,
			},
			{
				field: "fromContext",
				headerName: "From context",
				minWidth: 50,
				flex: 0.5,
				filterOperators: standardFilters,
			},
			{
				field: "fromValue",
				headerName: "From value",
				minWidth: 50,
				flex: 0.4,
				filterOperators: standardFilters,
			},
			{
				field: "toContext",
				headerName: "To context",
				minWidth: 50,
				flex: 0.5,
				filterOperators: standardFilters,
			},
			{
				field: "toValue",
				headerName: "To value",
				minWidth: 50,
				flex: 0.5,
				filterOperators: standardFilters,
				editable: true,
				valueGetter: (value: any, row: { toValue: any }) => row?.toValue,
			},
			{
				field: "lastImported",
				headerName: "Last imported",
				minWidth: 100,
				flex: 0.5,
				filterOperators: standardFilters,
				valueGetter: (value: any, row: { lastImported: any }) => {
					const lastImported = row.lastImported;
					const formattedDate = dayjs(lastImported).format("YYYY-MM-DD HH:mm");
					if (formattedDate == "Invalid Date") {
						return "";
					} else {
						return formattedDate;
					}
				},
			},
			{
				field: "toCategory",
				headerName: "To category",
				minWidth: 50,
				flex: 0.5,
				filterOperators: standardFilters,
				editable: true,
				valueGetter: (value: any, row: { toCategory: any }) => row?.toCategory,
			},
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
								icon={<Save />}
								label="Save"
								onClick={handleSaveClick(id)}
							/>,
							<GridActionsCellItem
								icon={<Cancel />}
								label="Cancel"
								onClick={handleCancelClick(id)}
							/>,
						];
					}
					return [
						<GridActionsCellItem
							icon={<Edit />}
							label="Edit"
							onClick={handleEditClick(id)}
						/>,
						<GridActionsCellItem
							icon={<Delete />}
							label="Delete"
							onClick={handleDeleteClick(id)}
						/>,
					];
				},
			},
		],
		[rowModesModel]
	);

	if (mappingsLoading || librariesLoading) {
		return (
			<Loading
				title={t("ui.info.loading.document")}
				subtitle="Loading mappings"
			/>
		);
	}

	return (
		<>
			<DataGrid
				identifier={gridId}
				type="ReferenceValueMappings"
				columns={standardRefValueMappingColumns}
				rows={mappingsData?.referenceValueMappings?.content ?? []}
				rowCount={mappingsData?.referenceValueMappings?.totalSize ?? 0}
				loading={mappingsLoading || librariesLoading}
				paginationMode="server"
				paginationModel={paginationModel}
				onPaginationModelChange={handlePaginationChange}
				filterMode="server"
				filterModel={filterModel}
				onFilterModelChange={handleFilterChange}
				sortingMode="server"
				sortModel={sortModel}
				onSortModelChange={handleSortChange}
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
			<Confirmation
				open={!!promiseArguments} // a direct state for this could prevent the issue with needing an early null check in changessummmary
				onClose={handleModalCancel}
				onConfirm={handleModalConfirm}
				gridEdit={true}
				entityName="ReferenceValueMapping"
				action="gridEdit"
				editInformation={editRecord}
			/>
			<Dialog
				open={!!deleteConfirmationId}
				onClose={() => setDeleteConfirmationId(null)}>
				<DialogTitle>Delete Mapping</DialogTitle>
				<DialogContent>
					Are you sure you want to delete this mapping?
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setDeleteConfirmationId(null)}>Cancel</Button>
					<Button onClick={handleConfirmDelete} color="error">
						Delete
					</Button>
				</DialogActions>
			</Dialog>
		</>
	);
}
