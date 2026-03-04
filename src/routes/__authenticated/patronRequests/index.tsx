import { useDataGridErrorSafely } from "@/hooks/useDataGridErrorSafely";
import { useGridStore } from "@/hooks/useDataGridStore";
import { useDebounce } from "@/hooks/useDebounce";
import { usePatronRequestExport } from "@/hooks/useExport";
import { usePatronRequestCleanup } from "@/hooks/usePatronRequestCleanup";
import DataGrid from "@components/DataGrid/DataGrid";
import { CleanupProgressDialog } from "@components/DataGrid/components/CleanupProgressDialog";
import { ExportProgressDialog } from "@components/DataGrid/components/ExportProgressDialog";
import Error from "@components/Error/Error";
import Loading from "@components/Loading/Loading";
import TimedAlert from "@components/TimedAlert/TimedAlert";
import { standardFilters } from "@constants/filters/filters";
import { defaultPatronRequestColumnVisibility } from "@helpers/dataGrid/columnVisibility/patronRequestColumnVisibility";
import { standardPatronRequestColumns } from "@helpers/dataGrid/columns/patronRequestColumns";
import { processGridFilterModel } from "@helpers/dataGrid/utilities";
import { Library } from "@models/Library";
import {
	LibrariesQueryData,
	PatronRequestQueryData,
} from "@models/ReactQueryHelperTypes";
import {
	GridColDef,
	GridColumnVisibilityModel,
	GridFilterModel,
	GridPaginationModel,
	GridRowModesModel,
	GridSortModel,
	useGridApiRef,
} from "@mui/x-data-grid-premium";
import { getLibraries } from "@queries/getLibraries";
import { getLibraryBibClusterIds } from "@queries/getLibraryBibClusterIds";
import { getPatronRequests } from "@queries/getPatronRequests";
import { getPatronRequestsForExport } from "@queries/getPatronRequestsForExport";
import { useQuery } from "@tanstack/react-query";
import {
	createFileRoute,
	// useNavigate,
	useRouter,
} from "@tanstack/react-router";
import axios from "axios";
import request from "graphql-request";
import { useCallback, useMemo, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "react-oidc-context";

export const Route = createFileRoute("/__authenticated/patronRequests/")({
	component: RouteComponent,
});

function RouteComponent() {
	const { t } = useTranslation();
	// const navigate = useNavigate();
	const auth = useAuth();
	const apiRef = useGridApiRef();
	const { cfg } = useRouter().options.context as { cfg: any };

	const dcbApiBase = cfg?.VITE_DCB_API_BASE;
	const searchApiBase = cfg?.VITE_DCB_SEARCH_BASE;
	const token = auth?.user?.access_token;
	const headers = useMemo(
		() => ({
			Authorization: `Bearer ${auth?.user?.access_token}`,
		}),
		[token],
	);
	const gridId = "mainPatronRequests";
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

	// const [alert, setAlert] = useState<AlertObject>({
	// 	open: false,
	// 	severity: "success",
	// 	text: "",
	// 	title: "",
	// });
	const [paginationModel, setLocalPaginationModel] =
		useState<GridPaginationModel>(
			storedState.pagination ?? { page: 0, pageSize: 25 },
		);

	const [alert, setAlert] = useState<{
		open: boolean;
		severity: "success" | "error" | "warning";
		text: string | null;
	}>({
		open: false,
		severity: "success",
		text: null,
	});

	// const [snackbarOpen, setSnackbarOpen] = useState(false);

	const handleSnackbarClose = (
		event?: React.SyntheticEvent | Event,
		reason?: string,
	) => {
		if (reason === "clickaway") {
			return;
		}
		setAlert({ open: false, severity: "success", text: null });
	};
	const [filterModel, setLocalFilterModel] = useState<GridFilterModel>(
		storedState.filter ?? { items: [] },
	);
	const debouncedFilterModel = useDebounce(filterModel, 500);

	const [sortModel, setLocalSortModel] = useState<GridSortModel>(
		storedState.sort ?? [{ field: "dateCreated", sort: "desc" }],
	);
	const [rowModesModel, setRowModesModel] = useState<GridRowModesModel>({});
	const [columnVisibilityModel, setLocalColumnVisibilityModel] = useState(
		storedState.columnVisibility ?? defaultPatronRequestColumnVisibility,
	);

	// Add state to track if we're filtering
	const [isFiltering, setIsFiltering] = useState(false);

	// Track when filter is being applied
	useEffect(() => {
		const hasActiveFilters =
			filterModel.items.some(
				(item) => item.value && item.value !== "" && item.value !== null,
			) ||
			(filterModel.quickFilterValues &&
				filterModel.quickFilterValues.length > 0);

		const hasActiveDebounceFilters =
			debouncedFilterModel.items.some(
				(item) => item.value && item.value !== "" && item.value !== null,
			) ||
			(debouncedFilterModel.quickFilterValues &&
				debouncedFilterModel.quickFilterValues.length > 0);

		// We're filtering if there are active filters but they don't match debounced filters
		const isDifferent =
			JSON.stringify(filterModel) !== JSON.stringify(debouncedFilterModel);
		setIsFiltering(!!hasActiveFilters && isDifferent);
	}, [filterModel, debouncedFilterModel]);

	const handlePaginationChange = useCallback(
		(model: GridPaginationModel) => {
			setLocalPaginationModel(model);
			setPaginationModel(gridId, model);
		},
		[gridId, setPaginationModel],
	);

	const handleFilterChange = useCallback(
		(model: GridFilterModel) => {
			setLocalFilterModel(model);
			setFilterModel(gridId, model);
		},
		[gridId, setFilterModel],
	);

	const handleSortChange = useCallback(
		(model: GridSortModel) => {
			setLocalSortModel(model);
			setSortModel(gridId, model);
		},
		[gridId, setSortModel],
	);

	const handleColumnVisibilityChange = useCallback(
		(model: GridColumnVisibilityModel) => {
			setLocalColumnVisibilityModel(model);
			setColumnVisibilityModel(gridId, model);
		},
		[gridId, setColumnVisibilityModel],
	);

	const code = auth.user?.profile?.code;
	const roles = auth?.user?.profile?.roles ? auth?.user?.profile?.roles : [];

	const isAdmin = roles.includes("ADMIN");
	// facets for options
	const { data: publisherOptions = [], isLoading: isPublishersLoading } =
		useQuery({
			queryKey: ["publisherFacets", searchApiBase, headers],
			queryFn: async () => {
				if (!searchApiBase) return [];
				try {
					const res = await axios.get(
						`${searchApiBase}/search/instances/facets`,
						{
							headers,
							params: {
								query: "cql.allRecords = 1",
								facet: "instancePublishers:500",
							},
						},
					);

					const buckets = res.data?.facets?.instancePublishers?.values || [];
					return buckets.map((bucket: any) => ({
						value: bucket.id,
						label: `${bucket.id} (${bucket.totalRecords})`,
					}));
				} catch (err) {
					console.error("Failed to fetch publisher facets:", err);
					return [];
				}
			},
			enabled: !!searchApiBase && !!token,
		});

	// Library query
	const {
		data: librariesData,
		isLoading: librariesLoading,
		isError: librariesError,
	} = useQuery<LibrariesQueryData>({
		queryKey: ["allLibraries", headers, code, dcbApiBase],
		queryFn: async () =>
			request(
				`${dcbApiBase}/graphql`,
				getLibraries,
				{
					query: "",
					pagesize: 1000,
					pageno: 0,
					order: "fullName",
					orderBy: "ASC",
				},
				headers,
			),
	});

	const libraries = librariesData?.libraries?.content ?? []; // This is all of the libraries, to be supplied to filters.
	const userLibrary = libraries.find((library) => library.agencyCode === code); // This is the user's library

	const userLibraryHostLmsCode = userLibrary?.agency?.hostLms?.code;

	const libraryFilterOptions = useMemo(() => {
		if (!libraries) return [];

		return libraries.map((lib: Library) => ({
			value: lib.agencyCode, // The value to be used in the filter (e.g., 'agency-code-123')
			label: lib.fullName, // The human-readable name (e.g., 'Main Library')
		}));
	}, [libraries]);

	// Columns that have dynamic options for their filters
	const dynamicPatronRequestColumns = useMemo(() => {
		const supplyingAgencyField = "supplyingAgencyCode";
		const titleField = "clusterRecordTitle";
		const modifiedColumns = standardPatronRequestColumns.map((col) => {
			if (col.field === supplyingAgencyField) {
				const { ...baseColProps } = col;
				const selectCol: GridColDef = {
					...baseColProps,
					type: "singleSelect",
					valueOptions: libraryFilterOptions,
				};
				return selectCol;
			}
			if (col.field === titleField) {
				return {
					...col,
					filterable: isAdmin, // Only filterable if user is admin
					filterOperators: isAdmin ? standardFilters : undefined,
				};
			}
			return col;
		});
		if (isAdmin) {
			// Not ready for prime time, just about good enough for demos
			modifiedColumns.push({
				field: "publisher",
				headerName: t("patron_requests.publisher", "Publisher"),
				filterable: true,
				sortable: false,
				type: "singleSelect",
				valueOptions: publisherOptions,
				valueGetter: (value, row) => {
					const members = row?.clusterRecord?.members;
					if (!Array.isArray(members) || members.length === 0) return "";

					const firstMemberWithPublisher = members.find(
						(member) => member?.publisher && member.publisher.trim() !== "",
					);

					return firstMemberWithPublisher?.publisher || "";
				},
			});
		}
		return modifiedColumns;
	}, [libraryFilterOptions, t, publisherOptions]);

	// Patron requests query - using debounced filter model
	const {
		data: patronRequestData,
		isLoading: isPatronRequestLoading,
		isError: isPatronRequestError,
		error,
		isFetching,
		refetch,
	} = useQuery<PatronRequestQueryData>({
		queryKey: [
			"getPatronRequests",
			dcbApiBase,
			headers,
			userLibraryHostLmsCode,
			debouncedFilterModel, // Use debounced filter model
			paginationModel.pageSize,
			paginationModel.page,
			sortModel[0]?.field,
			sortModel[0]?.sort,
		],
		// HIGHLY EXPERIMENTAL PUBLISHER FILTER
		// this is cursed but will have to do until the backend changes are in
		queryFn: async () => {
			const baseQuery = `patronHostlmsCode:${userLibraryHostLmsCode}`;
			let finalBaseQuery = baseQuery;

			const publisherFilter = debouncedFilterModel?.items?.find(
				(item) => item.field === "publisher" && item.value,
			);
			const titleFilter = debouncedFilterModel?.items?.find(
				(item) => item.field === "clusterRecordTitle" && item.value,
			);

			if (publisherFilter || titleFilter) {
				try {
					const prVariables = {
						query: baseQuery,
						pagesize: 100000,
						pageno: 0,
					};

					// Fetch ALL requests for this library AND their publishers/titles
					const prRes: any = await request(
						`${dcbApiBase}/graphql`,
						getLibraryBibClusterIds,
						prVariables,
						headers,
					);

					const matchedIdsRaw = prRes?.patronRequests?.content
						?.filter((pr: any) => {
							let matchesPublisher = true;
							let matchesTitle = true;

							if (publisherFilter) {
								const members = pr?.clusterRecord?.members;
								if (!Array.isArray(members)) {
									matchesPublisher = false;
								} else {
									matchesPublisher = members.some(
										(member: any) =>
											member?.publisher === publisherFilter.value,
									);
								}
							}

							if (titleFilter) {
								const title = pr?.clusterRecord?.title || "";
								const searchTerm = titleFilter.value.toLowerCase();

								if (titleFilter.operator === "equals") {
									matchesTitle = title.toLowerCase() === searchTerm;
								} else {
									// Fallback to 'contains' which is now perfectly safe and fast in JS!
									matchesTitle = title.toLowerCase().includes(searchTerm);
								}
							}

							// Must match both conditions (if both are applied)
							return matchesPublisher && matchesTitle;
						})
						?.map((pr: any) => pr.bibClusterId)
						.filter(Boolean);

					const uniqueMatchedIds = [...new Set(matchedIdsRaw)];

					if (uniqueMatchedIds.length > 0) {
						// slicing
						const uuidChain = uniqueMatchedIds
							.slice(0, 100)
							.map((id: unknown) => `bibClusterId:${id}`)
							.join(" OR ");
						finalBaseQuery += ` AND (${uuidChain})`;
					} else {
						finalBaseQuery += ` AND (bibClusterId:00000000-0000-0000-0000-000000000000)`;
					}
				} catch (err) {
					console.error("Failed to filter by Publisher/Title in GraphQL:", err);
					finalBaseQuery += ` AND (bibClusterId:00000000-0000-0000-0000-000000000000)`;
				}
			}

			// Strip out custom fields so standard grid utilities ignore them
			const cleanedFilterModel = {
				...debouncedFilterModel,
				items: debouncedFilterModel.items.filter(
					(item) =>
						item.field !== "publisher" && item.field !== "clusterRecordTitle",
				),
			};

			const queryVariables = {
				query:
					processGridFilterModel(cleanedFilterModel, finalBaseQuery, [
						"status",
						"description",
					]) ?? "",
				pagesize: paginationModel.pageSize ?? 200,
				pageno: paginationModel.page ?? 0,
				order: sortModel[0]?.field ?? "dateCreated",
				orderBy: sortModel[0]?.sort?.toUpperCase() ?? "DESC",
			};
			return request(
				`${dcbApiBase}/graphql`,
				getPatronRequests,
				queryVariables,
				headers,
			);
		},
		enabled: !!token && !!dcbApiBase && !!userLibraryHostLmsCode,
		refetchOnWindowFocus: true,
		refetchIntervalInBackground: false,
		placeholderData: (previousData) => previousData,
	});

	useDataGridErrorSafely(
		gridId,
		isPatronRequestError,
		error,
		setLocalFilterModel,
		setLocalSortModel,
		() =>
			setAlert({
				open: true,
				severity: "warning",
				text: t("ui.feedback.cannot_process"),
			}),
	);

	const { cleanupState, handleCleanup, handleCloseCleanup } =
		usePatronRequestCleanup({
			apiRef,
			dcbApiBase,
			headers,
			onSuccess: () => {
				refetch();
			},
		});
	const exportBaseQuery = `patronHostlmsCode:${userLibraryHostLmsCode}`;
	const { exportProgress, handleExport } = usePatronRequestExport({
		apiRef,
		dcbApiBase,
		headers,
		baseQuery: exportBaseQuery,
		exportQuery: getPatronRequestsForExport,
		filterModel: debouncedFilterModel,
		sortModel,
		onExportSuccess: (msg, count) => {
			console.log(msg);
			setAlert({
				open: true,
				severity: "success",
				text: t("ui.data_grid.export.success", { count: count }),
			});
		},
		onExportError: (msg) => {
			console.log(msg);
			setAlert({
				open: true,
				severity: "error",
				text: t("ui.data_grid.export.failed"),
			});
		},
		type: "patronRequests",
	});
	// Show loading if initial load or libraries are loading
	if ((isPatronRequestLoading && !patronRequestData) || librariesLoading) {
		return (
			<Loading
				title={t("ui.info.loading.document", {
					document_type: t("nav.patron_requests.title").toLowerCase(),
				})}
				subtitle={t("ui.feedback.please_wait")}
			/>
		);
	}
	if (isPatronRequestError) {
		console.log(error, isPatronRequestError, librariesError);
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

	// Determine if we should show loading state
	const shouldShowLoading =
		isFiltering ||
		isPatronRequestLoading ||
		isPublishersLoading ||
		(isFetching && !!patronRequestData);

	return (
		<>
			{
				<DataGrid
					parentApiRef={apiRef}
					disablePivoting
					rows={patronRequestData?.patronRequests?.content ?? []}
					columns={dynamicPatronRequestColumns}
					columnVisibilityModel={columnVisibilityModel}
					onColumnVisibilityModelChange={handleColumnVisibilityChange}
					type="patronRequests"
					identifier="patronRequestsMain"
					checkboxSelection={true}
					disableAggregation={true}
					disableHoverInteractions={true}
					disableRowGrouping={true}
					loading={shouldShowLoading} // Show loading when filtering or fetching
					listViewEnabled={false}
					noResultsText={t("patron_request.no_requests")}
					pagination
					pivotingEnabled={false}
					toolbarVisible
					searchText={t("ui.actions.search")}
					scrollbarVisible={false}
					paginationMode="server"
					paginationModel={paginationModel}
					onPaginationModelChange={handlePaginationChange}
					filterMode="server"
					filterModel={filterModel} // Use immediate filter model for UI
					onFilterModelChange={handleFilterChange}
					sortingMode="server"
					sortModel={sortModel}
					onSortModelChange={handleSortChange}
					rowCount={patronRequestData?.patronRequests?.totalSize ?? 0}
					rowModesModel={rowModesModel}
					onRowModesModelChange={setRowModesModel}
					enableCleanup={true}
					onCleanup={handleCleanup}
					onExport={handleExport}
					isExporting={exportProgress.isExporting}
				/>
			}
			<ExportProgressDialog
				open={exportProgress.isExporting}
				progress={exportProgress.progress}
				totalRecords={exportProgress.totalRecords}
			/>
			<CleanupProgressDialog
				open={cleanupState.open}
				isCleaning={cleanupState.isCleaning}
				progress={
					cleanupState.total > 0
						? (cleanupState.processed / cleanupState.total) * 100
						: 0
				}
				total={cleanupState.total}
				processed={cleanupState.processed}
				successRows={cleanupState.successRows}
				errorRows={cleanupState.errorRows}
				skippedRows={cleanupState.skippedRows}
				onClose={handleCloseCleanup}
			/>

			{
				<TimedAlert
					open={alert.open}
					onCloseFunc={handleSnackbarClose}
					severityType={alert.severity}
					// variant="filled"
					// sx={{ width: "100%" }}
					autoHideDuration={6000}
					alertText={alert.text}></TimedAlert>
			}
		</>
	);
}
