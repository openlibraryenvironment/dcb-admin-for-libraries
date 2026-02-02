import Error from "@components/Error/Error";
import RenderAttribute from "@components/RenderAttribute/RenderAttribute";
import {
	AgencyQueryData,
	HostLmsQueryData,
	LibrariesQueryData,
	LocationsQueryData,
	PatronIdentitiesQueryData,
	PatronRequestQueryData,
} from "@models/ReactQueryHelperTypes";
import TabContext from "@mui/lab/TabContext";
import TabList from "@mui/lab/TabList";
import TabPanel from "@mui/lab/TabPanel";
import {
	Accordion,
	AccordionDetails,
	AccordionSummary,
	Button,
	CircularProgress,
	Divider,
	Grid,
	Stack,
	Tab,
	Tooltip,
	Typography,
} from "@mui/material";
import { getPatronIdentities } from "@queries/getPatronIdentities";
import { getPatronRequest } from "@queries/getPatronRequest";
import { getLocation } from "@queries/getLocation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import request from "graphql-request";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "react-oidc-context";
import dayjs from "dayjs";
import DataGrid from "@components/DataGrid/DataGrid";
import TimedAlert from "@components/TimedAlert/TimedAlert";
import ExpandMore from "@mui/icons-material/ExpandMore";
import { formatDuration } from "@helpers/formatDuration";
import Loading from "@components/Loading/Loading";
import {
	GridPaginationModel,
	GridRowModesModel,
} from "@mui/x-data-grid-premium";
import { CustomLink } from "@components/CustomLink";
import { SourceRecord } from "@models/SourceRecord";
import { getLibraryBasics } from "@queries/getLibraryBasics";
import { Library } from "@models/Library";
import { getILS } from "@helpers/getILS";
import { findPrimaryContacts } from "@helpers/findPrimaryContacts";
import { HostLMS } from "@models/HostLMS";
import { getHostLms } from "@queries/getHostLms";
import { getAgency } from "@queries/getAgency";
import { Agency } from "@models/Agency";
import { cleanupStatuses } from "@constants/statuses/cleanupStatuses";
import { untrackedStatuses } from "@constants/statuses/untrackedStatuses";
import { useGridStore } from "@/hooks/useDataGridStore";

export const Route = createFileRoute("/__authenticated/patronRequests/$id/")({
	component: RouteComponent,
});

function RouteComponent() {
	const { id } = Route.useParams();
	const { cfg } = useRouter().options.context as { cfg: any };
	const { t } = useTranslation();

	const auth = useAuth();
	const [updateSuccessAlertVisibility, setUpdateSuccessAlertVisibility] =
		useState(false);
	const [cleanupSuccessAlertVisibility, setCleanupSuccessAlertVisibility] =
		useState(false);
	const [updateErrorAlertVisibility, setErrorAlertVisibility] = useState(false);
	const [cleanupErrorAlertVisibility, setCleanupErrorAlertVisibility] =
		useState(false);
	const headers = useMemo(
		() => ({
			Authorization: `Bearer ${auth.user?.access_token}`,
		}),
		[auth.user?.access_token],
	);
	const [rowModesModel, setRowModesModel] = useState<GridRowModesModel>({});
	// const [auditPaginationModel, setAuditPaginationModel] = useState({
	// 	page: 0,
	// 	pageSize: 25,
	// });
	const auditGridId = `audit-log-${id}`; // Unique ID for each request
	const {
		paginationModel: auditPaginationModel,
		setPaginationModel: setAuditPaginationModel,
		filterModel: auditFilterModel,
		setFilterModel: setAuditFilterModel,
		sortModel: auditSortModel,
		setSortModel: setAuditSortModel,
	} = useGridStore();
	const currentPagination = auditPaginationModel[auditGridId] ?? {
		page: 0,
		pageSize: 25,
	};
	const currentFilter = auditFilterModel[auditGridId] ?? { items: [] };
	const currentSort = auditSortModel[auditGridId] ?? [
		{ field: "auditDate", sort: "desc" },
	];

	const {
		data,
		isError,
		isLoading: patronRequestLoading,
	} = useQuery<PatronRequestQueryData>({
		// The dependencies are now restored in the queryKey
		queryKey: ["patronRequest", id, headers, cfg.VITE_DCB_API_BASE],
		queryFn: async () =>
			request(
				cfg.VITE_DCB_API_BASE + "/graphql",
				getPatronRequest,
				{
					query: "id:" + id,
					pagesize: 10,
					pageno: 0,
					orderBy: "dateUpdated",
					order: "DESC",
				},
				headers,
			),
	});
	const patronRequest = data?.patronRequests?.content?.[0];
	const members = patronRequest?.clusterRecord?.members;
	const queryClient = useQueryClient();

	// URLs for our various operations
	const cleanupUrl =
		cfg.VITE_DCB_API_BASE + "/patrons/requests/" + id + "/transition/cleanup";
	const bibClusterRecordUrl = cfg.VITE_DCB_SEARCH_BASE // This needs fixing
		? "/requesting/" + patronRequest?.bibClusterId
		: "";
	const updateUrl =
		cfg.VITE_DCB_API_BASE + "/patrons/requests/" + id + "/update";

	const {
		data: supplierLibraryData,
		isError: supplierLibraryError,
		isLoading: supplierLibraryLoading,
	} = useQuery<LibrariesQueryData>({
		// The dependencies are now restored in the queryKey
		queryKey: [
			"patronRequestSupplierLibrary",
			id,
			headers,
			cfg.VITE_DCB_API_BASE,
			patronRequest?.suppliers[0]?.localAgency,
		],
		enabled: !!patronRequest?.suppliers[0]?.localAgency,

		queryFn: async () =>
			request(
				cfg.VITE_DCB_API_BASE + "/graphql",
				getLibraryBasics,
				{
					query: "agencyCode:" + patronRequest?.suppliers[0]?.localAgency,
					pageno: 0,
					pagesize: 10,
					order: "agencyCode",
					orderBy: "ASC",
				},
				headers,
			),
	});

	console.log(supplierLibraryError);
	const supplierLibraries: Library[] =
		supplierLibraryData?.libraries?.content ?? [];
	const supplierLibrary = supplierLibraries?.[0];

	const {
		data: patronIdentitiesData,
		isError: patronIdentitiesError,
		isLoading: patronIdentitiesLoading,
	} = useQuery<PatronIdentitiesQueryData>({
		queryKey: [
			"patronIdentities",
			patronRequest?.pickupPatronId,
			headers,
			cfg.VITE_DCB_API_BASE,
		],
		enabled:
			patronRequest?.pickupPatronId != null &&
			patronRequest?.pickupPatronId != undefined,
		queryFn: async () =>
			request(
				cfg.VITE_DCB_API_BASE + "/graphql",
				getPatronIdentities,
				{
					query: "localId:" + patronRequest?.pickupPatronId,
					pageno: 0,
					pagesize: 10,
					order: "localId",
					orderBy: "ASC",
				},
				headers,
			),
	});

	const pickupPatronIdentity =
		patronIdentitiesData?.patronIdentities?.content?.[0];

	const {
		data: pickupLocationData,
		isError: pickupLocationDataError,
		isLoading: pickupLocationDataLoading,
	} = useQuery<LocationsQueryData>({
		queryKey: [
			"patronRequestPickupLocation",
			patronRequest?.pickupLocationCode,
			headers,
			cfg.VITE_DCB_API_BASE,
		],
		enabled:
			patronRequest?.pickupLocationCode != null &&
			patronRequest?.pickupLocationCode != undefined,
		queryFn: async () =>
			request(
				cfg.VITE_DCB_API_BASE + "/graphql",
				getLocation,
				{
					// Note: pickupLocationCode is expected to be the location id (UUID)
					query: "id:" + patronRequest?.pickupLocationCode,
					pageno: 0,
					pagesize: 10,
					order: "id",
					orderBy: "ASC",
				},
				headers,
			),
	});

	const pickupLocation = pickupLocationData?.locations?.content?.[0];
	const {
		data: pickupLibraryData,
		isError: pickupLibraryError,
		isLoading: pickupLibraryLoading,
	} = useQuery<LibrariesQueryData>({
		// The dependencies are now restored in the queryKey
		queryKey: [
			"patronRequestPickupLibrary",
			id,
			headers,
			cfg.VITE_DCB_API_BASE,
			pickupLocation?.agency?.code,
		],
		enabled: !!pickupLocation?.agency?.code,
		queryFn: async () =>
			request(
				cfg.VITE_DCB_API_BASE + "/graphql",
				getLibraryBasics,
				{
					query: "agencyCode:" + pickupLocation?.agency?.code,
					pageno: 0,
					pagesize: 10,
					order: "agencyCode",
					orderBy: "ASC",
				},
				headers,
			),
	});
	console.log(pickupLibraryError);

	const pickupLibraries: Library[] =
		pickupLibraryData?.libraries?.content ?? [];
	const pickupLibrary = pickupLibraries?.[0];

	// Patron library is a little harder ...
	// Get Host LMS code, ID, then agency, then library
	const {
		data: patronLmsData,
		isError: patronLmsError,
		isLoading: patronLmsLoading,
	} = useQuery<HostLmsQueryData>({
		// The dependencies are now restored in the queryKey
		queryKey: [
			"patronRequestPatronLms",
			id,
			headers,
			cfg.VITE_DCB_API_BASE,
			patronRequest?.patronHostlmsCode,
		],
		enabled: !!patronRequest?.patronHostlmsCode,
		queryFn: async () =>
			request(
				cfg.VITE_DCB_API_BASE + "/graphql",
				getHostLms,
				{
					query: "code:" + patronRequest?.patronHostlmsCode,
					pageno: 0,
					pagesize: 10,
					order: "name",
					orderBy: "ASC",
				},
				headers,
			),
	});
	const patronHostLmss: HostLMS[] = patronLmsData?.hostLms?.content ?? [];
	console.log(patronLmsError);

	const patronHostLms: HostLMS = patronHostLmss?.[0];

	const {
		data: patronAgencyData,
		isError: patronAgencyError,
		isLoading: patronAgencyLoading,
	} = useQuery<AgencyQueryData>({
		// The dependencies are now restored in the queryKey
		queryKey: [
			"patronRequestAgency",
			id,
			headers,
			cfg.VITE_DCB_API_BASE,
			patronHostLms?.id,
		],
		enabled: !!patronHostLms?.id,
		queryFn: async () =>
			request(
				cfg.VITE_DCB_API_BASE + "/graphql",
				getAgency,
				{
					query: "hostLms:" + patronHostLms?.id,
					pageno: 0,
					pagesize: 10,
					order: "name",
					orderBy: "ASC",
				},
				headers,
			),
	});
	console.log(patronAgencyError);

	// Which we can then use to get library. When we combine library and agency we can eliminate this but for now we're stuck with it
	const patronAgencies = patronAgencyData?.agencies?.content ?? [];
	const patronAgency: Agency = patronAgencies?.[0];

	const {
		data: patronLibraryData,
		isError: patronLibraryError,
		isLoading: patronLibraryLoading,
	} = useQuery<LibrariesQueryData>({
		// The dependencies are now restored in the queryKey
		queryKey: [
			"patronRequestLibrary",
			id,
			headers,
			cfg.VITE_DCB_API_BASE,
			patronAgency?.code,
		],
		enabled: !!patronAgency?.code,
		queryFn: async () =>
			request(
				cfg.VITE_DCB_API_BASE + "/graphql",
				getLibraryBasics,
				{
					query: "agencyCode:" + patronAgency?.code,
					pageno: 0,
					pagesize: 10,
					order: "agencyCode",
					orderBy: "ASC",
				},
				headers,
			),
	});

	const patronLibraries: Library[] =
		patronLibraryData?.libraries?.content ?? [];
	const patronLibrary = patronLibraries?.[0];

	console.log(patronLibraryError);

	// Mutation for updating the patron request
	const updateMutation = useMutation({
		mutationFn: () => {
			return fetch(updateUrl, {
				method: "POST",
				headers,
			});
		},
		onSuccess: () => {
			// When the mutation is successful, invalidate the query to refetch the data
			queryClient.invalidateQueries({ queryKey: ["patronRequest", id] });
			setUpdateSuccessAlertVisibility(true);
		},
		onError: (error) => {
			console.error("Error starting update", error);
			setErrorAlertVisibility(true);
		},
	});

	// Mutation for cleaning up the patron request
	const cleanupMutation = useMutation({
		mutationFn: () => {
			return fetch(cleanupUrl, {
				method: "POST",
				headers,
			});
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["patronRequest", id] });
			setCleanupSuccessAlertVisibility(true);
		},
		onError: (error) => {
			console.error("Error starting cleanup", error);
			setCleanupErrorAlertVisibility(true);
		},
	});

	const [activeTab, setActiveTab] = useState(0);

	const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
		setActiveTab(newValue);
	};

	if (patronRequestLoading) {
		return (
			<Loading
				title={t("ui.info.loading.document", {
					document_type: t("patron_request.title").toLowerCase(),
				})}
				subtitle={t("ui.info.wait")}
			/>
		);
	}

	return isError || patronRequest == null || patronRequest == undefined ? (
		<>
			{isError ? (
				<Error
					title={t("ui.feedback.error.cannot_retrieve_record")}
					message={t("ui.info.connection_issue")}
					description={t("ui.info.try_later")}
					action={t("ui.actions.go_back")}
					goBack="/patronRequests/exception"
				/>
			) : (
				<Error
					title={t("ui.feedback.error.cannot_find_record")}
					message={t("ui.feedback.error.invalid_UUID")}
					description={t("ui.info.check_address")}
					action={t("ui.actions.go_back")}
					goBack="/patronRequests/exception"
				/>
			)}
		</>
	) : (
		<>
			<Typography variant="h1" mb={3} mt={3}>
				{patronRequest?.clusterRecord?.title}
			</Typography>
			<TabContext value={activeTab}>
				<TabList
					onChange={handleTabChange}
					variant="scrollable"
					className="secondary">
					{/** Because tab list doesn't support custom variants, we have to get tricky */}
					{/** The tabs are a little frustrating with variants because they use functional variants.
					 * So style variants like those we prefer to use everywhere else don't get a look in.
					 */}
					<Tab label={t("patron_request.general")} />
					<Tab label={t("requesting.bib_record")} />
					<Tab label={t("patron_request.supplying")} />
					<Tab label={t("patron_request.borrowing")} />
					<Tab label={t("patron_request.pickup")} />
					<Tab label={t("audit.log")} />
				</TabList>

				<TabPanel value={0}>
					<Grid
						container
						spacing={{ xs: 2, md: 3 }}
						columns={{ xs: 3, sm: 6, md: 9, lg: 12 }}>
						<Grid size={{ xs: 4, sm: 8, md: 12, lg: 16 }}>
							<Typography variant="accordionSummary">
								{t("patron_request.general")}
							</Typography>
						</Grid>
						{patronLibrary?.fullName ? (
							<Grid size={{ xs: 2, sm: 4, md: 4 }}>
								<Stack direction={"column"}>
									<Typography variant="attributeTitle">
										{t("patron_request.patron_library")}
									</Typography>
									<Tooltip
										title={t("patron_request.request_tooltip", {
											ils: getILS(
												patronLibrary?.agency?.hostLms?.lmsClientClass,
											),
											contact: patronLibrary?.contacts
												? findPrimaryContacts(patronLibrary?.contacts)
												: t("libraries.no_contact"),
										})}>
										<span>
											<RenderAttribute attribute={patronLibrary?.fullName} />
										</span>
									</Tooltip>
								</Stack>
							</Grid>
						) : patronLibraryLoading ||
						  patronLmsLoading ||
						  patronAgencyLoading ? (
							<CircularProgress size="1rem" />
						) : null}
						{supplierLibrary?.fullName ? (
							<Grid size={{ xs: 2, sm: 4, md: 4 }}>
								<Stack direction={"column"}>
									<Typography variant="attributeTitle">
										{t("patron_request.supplier_library")}
									</Typography>
									<Tooltip
										title={t("patron_request.request_tooltip", {
											ils: getILS(
												supplierLibrary?.agency?.hostLms?.lmsClientClass,
											),
											contact: supplierLibrary?.contacts
												? findPrimaryContacts(supplierLibrary?.contacts)
												: t("libraries.no_contact"),
										})}>
										<span>
											<RenderAttribute attribute={supplierLibrary?.fullName} />
										</span>
									</Tooltip>
								</Stack>
							</Grid>
						) : supplierLibraryLoading ? (
							<CircularProgress size="1rem" />
						) : null}
						{pickupLibrary?.fullName ? (
							<Grid size={{ xs: 2, sm: 4, md: 4 }}>
								<Stack direction={"column"}>
									<Typography variant="attributeTitle">
										{t("patron_request.pickup_library")}
									</Typography>
									<Tooltip
										title={t("patron_request.request_tooltip", {
											ils: getILS(
												pickupLibrary?.agency?.hostLms?.lmsClientClass,
											),
											contact: pickupLibrary?.contacts
												? findPrimaryContacts(pickupLibrary?.contacts)
												: t("libraries.no_contact"),
										})}>
										<span>
											<RenderAttribute attribute={pickupLibrary?.fullName} />
										</span>
									</Tooltip>
								</Stack>
							</Grid>
						) : pickupLibraryLoading ? (
							<CircularProgress size="1rem" />
						) : null}

						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("patron_request.patron_hostlms")}
								</Typography>
								<RenderAttribute attribute={patronRequest?.patronHostlmsCode} />
							</Stack>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("patron_request.borrowing_patron_barcode")}
								</Typography>
								<RenderAttribute
									attribute={patronRequest?.requestingIdentity?.localBarcode}
								/>
							</Stack>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("patron_request.supplying_agency_code")}
								</Typography>
								<RenderAttribute
									attribute={patronRequest?.suppliers[0]?.localAgency}
								/>
							</Stack>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("patron_request.pickup_agency_code")}
								</Typography>
								{pickupLocationDataLoading ? (
									<CircularProgress
										color="inherit"
										size={13}
										sx={{ marginLeft: "10px" }}
									/>
								) : (
									<RenderAttribute
										attribute={
											pickupLocationDataError
												? t("patron_request..error_pickup")
												: pickupLocation?.agency?.code
										}
									/>
								)}
							</Stack>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("patron_request.pickup_hostlms_code")}
								</Typography>
								{pickupLocationDataLoading ? (
									<CircularProgress
										color="inherit"
										size={13}
										sx={{ marginLeft: "10px" }}
									/>
								) : (
									<RenderAttribute
										attribute={
											pickupLocationDataError
												? t("patron_request..error_pickup")
												: pickupLocation?.hostSystem?.code
										}
									/>
								)}
							</Stack>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("patron_request.pickup_location_name")}
								</Typography>
								{pickupLocationDataLoading ? (
									<CircularProgress
										color="inherit"
										size={13}
										sx={{ marginLeft: "10px" }}
									/>
								) : pickupLocationDataError ? (
									t("patron_request.error_pickup")
								) : auth?.user?.profile?.roles?.includes("LIBRARY_ADMIN") ? (
									<Tooltip title={t("location.view_location")}>
										<CustomLink to={`/locations/${pickupLocation?.id}`}>
											{pickupLocation?.name}
										</CustomLink>
									</Tooltip>
								) : (
									<RenderAttribute attribute={pickupLocation?.name} />
								)}
							</Stack>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("patron_request.request_created")}
								</Typography>
								<RenderAttribute
									attribute={dayjs(patronRequest?.dateCreated).format(
										"YYYY-MM-DD HH:mm",
									)}
								/>
							</Stack>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("patron_request.request_updated")}
								</Typography>
								<RenderAttribute
									attribute={dayjs(patronRequest?.dateUpdated).format(
										"YYYY-MM-DD HH:mm",
									)}
								/>
							</Stack>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("patron_request.next_poll")}
								</Typography>
								<RenderAttribute
									attribute={dayjs(patronRequest?.nextScheduledPoll).format(
										"YYYY-MM-DD HH:mm",
									)}
								/>
							</Stack>
							<Tooltip
								title={
									!untrackedStatuses.includes(patronRequest?.status)
										? ""
										: t("patron_request.check_for_updates_disabled", {
												status: patronRequest?.status,
											}) // Tooltip text when disabled
								}>
								<span>
									<Button
										variant="outlined"
										color="primary"
										sx={{ marginTop: 1 }}
										onClick={() => updateMutation.mutate()}
										aria-disabled={updateMutation.isPending ? true : false}
										disabled={
											updateMutation.isPending ||
											untrackedStatuses.includes(patronRequest?.status)
												? true
												: false
										}>
										{t("patron_request.check_for_updates")}
										{updateMutation.isPending ? (
											<CircularProgress
												color="inherit"
												size={13}
												sx={{ marginLeft: "10px" }}
											/>
										) : null}
									</Button>
								</span>
							</Tooltip>
							<TimedAlert
								open={
									updateSuccessAlertVisibility || cleanupSuccessAlertVisibility
								}
								severityType="success"
								autoHideDuration={6000}
								alertText={
									updateSuccessAlertVisibility
										? t("patron_request.check_successful")
										: t("patron_request.cleanup_successful")
								}
								key={
									updateSuccessAlertVisibility
										? "update-success-alert"
										: "cleanup-success-alert"
								}
								onCloseFunc={
									updateSuccessAlertVisibility
										? () => setUpdateSuccessAlertVisibility(false)
										: () => setCleanupSuccessAlertVisibility(false)
								}
							/>
							<TimedAlert
								open={updateErrorAlertVisibility || cleanupErrorAlertVisibility}
								severityType="error"
								autoHideDuration={6000}
								alertText={
									updateErrorAlertVisibility
										? t("patron_request.check_unsuccessful")
										: t("patron_request.cleanup_unsuccessful")
								}
								key={
									updateErrorAlertVisibility
										? "update-error-alert"
										: "cleanup-error-alert"
								}
								onCloseFunc={
									updateErrorAlertVisibility
										? () => setErrorAlertVisibility(false)
										: () => setCleanupErrorAlertVisibility(false)
								}
							/>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("patron_request.previous_status")}
								</Typography>
								<RenderAttribute attribute={patronRequest?.previousStatus} />
							</Stack>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("patron_request.status")}
								</Typography>
								<RenderAttribute attribute={patronRequest?.status} />
							</Stack>
							{auth?.user?.profile?.roles?.includes("LIBRARY_ADMIN") ? (
								<Tooltip
									title={
										cleanupStatuses.includes(patronRequest?.status)
											? // Must be both request with ERROR or non-terminal state and a user with LIBRARY_ADMIN
												t("patron_request.cleanup_info")
											: t("patron_request.cleanup_disabled") // Tooltip text when disabled
									}>
									<span>
										<Button
											variant="outlined"
											color="primary"
											sx={{ marginTop: 1 }}
											onClick={() => cleanupMutation.mutate()}
											aria-disabled={cleanupMutation.isPending ? true : false}
											disabled={
												cleanupMutation.isPending ||
												!cleanupStatuses.includes(patronRequest?.status)
											}>
											{t("patron_request.cleanup")}
											{cleanupMutation.isPending ? (
												<CircularProgress
													color="inherit"
													size={13}
													sx={{ marginLeft: "10px" }}
												/>
											) : null}
										</Button>
									</span>
								</Tooltip>
							) : null}
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("patron_request.next_expected_status")}
								</Typography>
								<RenderAttribute
									attribute={patronRequest?.nextExpectedStatus?.toString()}
								/>
							</Stack>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("patron_request.status_changed")}
								</Typography>
								<RenderAttribute
									attribute={dayjs(
										patronRequest?.currentStatusTimestamp,
									).format("YYYY-MM-DD HH:mm:ss.SSS")}
								/>
							</Stack>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("patron_request.time_in_status")}
								</Typography>
								<RenderAttribute
									attribute={formatDuration(
										patronRequest?.elapsedTimeInCurrentStatus,
									)}
								/>
							</Stack>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("patron_request.polling_checks_in_status")}
								</Typography>
								<RenderAttribute
									attribute={patronRequest?.pollCountForCurrentStatus?.toString()}
								/>
							</Stack>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("patron_request.active_workflow")}
								</Typography>
								<RenderAttribute attribute={patronRequest?.activeWorkflow} />
							</Stack>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("patron_request.out_of_sequence")}
								</Typography>
								<RenderAttribute
									attribute={patronRequest?.outOfSequenceFlag?.toString()}
								/>
							</Stack>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("patron_request.resolution_count")}
								</Typography>
								<RenderAttribute
									attribute={patronRequest?.resolutionCount?.toString()}
								/>
							</Stack>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("patron_request.renewal_status")}
								</Typography>
								<RenderAttribute attribute={patronRequest?.renewalStatus} />
							</Stack>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("patron_request.renewal_count")}
								</Typography>
								<RenderAttribute
									attribute={patronRequest?.renewalCount?.toString()}
								/>
							</Stack>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("patron_request.error_message")}
								</Typography>
								<RenderAttribute attribute={patronRequest?.errorMessage} />
							</Stack>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("patron_request.requestor_note")}
								</Typography>
								<RenderAttribute attribute={patronRequest?.requesterNote} />
							</Stack>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("patron_request.description")}
								</Typography>
								<RenderAttribute attribute={patronRequest?.description} />
							</Stack>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("patron_request.request_uuid")}
								</Typography>
								<RenderAttribute attribute={patronRequest?.id} />
							</Stack>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("requesting.expedited_checkout.request_title")}
								</Typography>
								<RenderAttribute
									attribute={patronRequest?.isExpeditedCheckout}
								/>
							</Stack>
						</Grid>
					</Grid>
				</TabPanel>

				<TabPanel value={1}>
					<Grid
						container
						spacing={{ xs: 2, md: 3 }}
						columns={{ xs: 3, sm: 6, md: 9, lg: 12 }}>
						<Grid size={{ xs: 4, sm: 8, md: 12, lg: 16 }}>
							<Typography variant="accordionSummary">
								{t("requesting.bib_record")}
							</Typography>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("bibs.record_title")}
								</Typography>
								<RenderAttribute
									attribute={patronRequest?.clusterRecord?.title}
								/>
							</Stack>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("bibs.record_created")}
								</Typography>
								<RenderAttribute
									attribute={dayjs(
										patronRequest?.clusterRecord?.dateCreated,
									).format("YYYY-MM-DD HH:mm")}
								/>
							</Stack>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("bibs.record_updated")}
								</Typography>
								<RenderAttribute
									attribute={dayjs(
										patronRequest?.clusterRecord?.dateUpdated,
									).format("YYYY-MM-DD HH:mm")}
								/>
							</Stack>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("bibs.cluster_uuid")}
								</Typography>
								{bibClusterRecordUrl == "" ? (
									<RenderAttribute attribute={patronRequest?.bibClusterId} />
								) : (
									<Tooltip
										title={t("bibs.view_cluster_record", {
											id: patronRequest?.bibClusterId,
											title: patronRequest?.clusterRecord?.title,
										})}>
										<CustomLink
											to={bibClusterRecordUrl}
											href={bibClusterRecordUrl}
											key="bibClusterRecordLink"
											title={t("common.discovery")}>
											<RenderAttribute
												attribute={patronRequest?.bibClusterId}
											/>
										</CustomLink>
									</Tooltip>
								)}
							</Stack>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("bibs.selected_bib_uuid")}
								</Typography>
								<RenderAttribute
									attribute={patronRequest?.clusterRecord?.selectedBib}
								/>
							</Stack>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("bibs.source_record_id")}
								</Typography>
								<RenderAttribute
									attribute={
										patronRequest?.clusterRecord?.members[0]?.sourceRecordId
									}
								/>
							</Stack>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("bibs.source_system_id")}
								</Typography>
								<RenderAttribute
									attribute={
										patronRequest?.clusterRecord?.members[0]?.sourceSystemId
									}
								/>
							</Stack>
						</Grid>
					</Grid>
					<Accordion variant="sub" disableGutters>
						<AccordionSummary
							// variant="sub" // To be restored once issue with accordion summary variants is resolved
							sx={{
								backgroundColor: "transparent",
								"&.Mui-focusVisible": {
									outline: "2px solid", // For keyboard focus
								},
							}}
							aria-controls="request-source-record"
							id="request_source_record"
							expandIcon={<ExpandMore fontSize="large" />}>
							<Typography variant="h3" sx={{ fontWeight: "bold" }}>
								{t("bibs.source_record")}
							</Typography>
						</AccordionSummary>
						<AccordionDetails>
							{members &&
							members.some(
								(member: { sourceRecord: SourceRecord }) =>
									member.sourceRecord !== null,
							) ? (
								members.map(
									(member: { sourceRecord: SourceRecord }, index: number) =>
										member.sourceRecord && (
											<pre key={index}>
												{JSON.stringify(member.sourceRecord, null, 2)}
											</pre>
										),
								)
							) : (
								<Typography variant="body1">
									{t("patron_request.source_record_not_found")}
								</Typography>
							)}
						</AccordionDetails>
					</Accordion>
				</TabPanel>

				<TabPanel value={2}>
					{/* We may have to change this for multiple suppliers. Could make it a grid. */}
					<Grid
						container
						spacing={{ xs: 2, md: 3 }}
						columns={{ xs: 3, sm: 6, md: 9, lg: 12 }}>
						<Grid size={{ xs: 4, sm: 8, md: 12, lg: 16 }}>
							<Typography variant="accordionSummary">
								{t("patron_request.supplying")}
							</Typography>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("patron_request.supplying_agency_code")}
								</Typography>
								<RenderAttribute
									attribute={patronRequest?.suppliers[0]?.localAgency}
								/>
							</Stack>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("hostlms.code")}
								</Typography>
								<RenderAttribute
									attribute={patronRequest?.suppliers[0]?.hostLmsCode}
								/>
							</Stack>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("patron_request.active")}
								</Typography>
								<RenderAttribute
									attribute={String(patronRequest?.suppliers[0]?.isActive)}
								/>
							</Stack>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("patron_request.date_created")}
								</Typography>
								<RenderAttribute
									attribute={dayjs(
										patronRequest?.suppliers[0]?.dateCreated,
									).format("YYYY-MM-DD HH:mm")}
								/>
							</Stack>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("patron_request.date_updated")}
								</Typography>
								<RenderAttribute
									attribute={dayjs(
										patronRequest?.suppliers[0]?.dateUpdated,
									).format("YYYY-MM-DD HH:mm")}
								/>
							</Stack>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("patron_request.local_request_status")}
								</Typography>
								<RenderAttribute
									attribute={patronRequest?.suppliers[0]?.localStatus}
								/>
							</Stack>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("patron_request.local_request_status_raw")}
								</Typography>
								<RenderAttribute
									attribute={patronRequest?.suppliers[0]?.rawLocalStatus}
								/>
							</Stack>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("patron_request.supplier_uuid")}
								</Typography>
								<RenderAttribute attribute={patronRequest?.suppliers[0]?.id} />
							</Stack>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("patron_request.local_bib_id")}
								</Typography>
								<RenderAttribute
									attribute={patronRequest?.suppliers[0]?.localBibId}
								/>
							</Stack>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("patron_request.local_supplier_id")}
								</Typography>
								<RenderAttribute
									attribute={patronRequest?.suppliers[0]?.localId}
								/>
							</Stack>
						</Grid>
					</Grid>

					<Grid
						container
						spacing={{ xs: 2, md: 3 }}
						columns={{ xs: 3, sm: 6, md: 9, lg: 12 }}>
						<Grid size={{ xs: 4, sm: 8, md: 12, lg: 16 }} mb={1} mt={1}>
							<Divider aria-hidden="true"></Divider>
						</Grid>
						<Grid size={{ xs: 4, sm: 8, md: 12, lg: 16 }}>
							<Typography variant="h3" sx={{ fontWeight: "bold" }}>
								{t("patron_request.item")}
							</Typography>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("patron_request.local_item_barcode")}
								</Typography>
								<RenderAttribute
									attribute={patronRequest?.suppliers[0]?.localItemBarcode}
								/>
							</Stack>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("patron_request.local_item_loc")}
								</Typography>
								<RenderAttribute
									attribute={patronRequest?.suppliers[0]?.localItemLocationCode}
								/>
							</Stack>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("patron_request.local_item_status")}
								</Typography>
								<RenderAttribute
									attribute={patronRequest?.suppliers[0]?.localItemStatus}
								/>
							</Stack>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("patron_request.local_item_status_raw")}
								</Typography>
								<RenderAttribute
									attribute={patronRequest?.suppliers[0]?.rawLocalItemStatus}
								/>
							</Stack>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("patron_request.renewal_count_supplier")}
								</Typography>
								<RenderAttribute
									attribute={patronRequest?.suppliers[0]?.localRenewalCount?.toString()}
								/>
							</Stack>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("patron_request.local_item_type")}
								</Typography>
								<RenderAttribute
									attribute={patronRequest?.suppliers[0]?.localItemType}
								/>
							</Stack>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("patron_request.supplier_ctype")}
								</Typography>
								<RenderAttribute
									attribute={patronRequest?.suppliers[0]?.canonicalItemType}
								/>
							</Stack>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("patron_request.local_item_id")}
								</Typography>
								<RenderAttribute
									attribute={patronRequest?.suppliers[0]?.localItemId}
								/>
							</Stack>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("patron_request.item_manually_selected")}
								</Typography>
								<RenderAttribute
									attribute={patronRequest.isManuallySelectedItem?.toString()}
								/>
							</Stack>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("patron_request.item_manual_agency_code")}
								</Typography>
								<RenderAttribute
									attribute={patronRequest?.localItemAgencyCode}
								/>
							</Stack>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("patron_request.item_manual_hostlms_code")}
								</Typography>
								<RenderAttribute
									attribute={patronRequest?.localItemHostlmsCode}
								/>
							</Stack>
						</Grid>
					</Grid>

					<Grid
						container
						spacing={{ xs: 2, md: 3 }}
						columns={{ xs: 3, sm: 6, md: 9, lg: 12 }}>
						<Grid size={{ xs: 4, sm: 8, md: 12, lg: 16 }} mb={1} mt={1}>
							<Divider aria-hidden="true"></Divider>
						</Grid>
						<Grid size={{ xs: 4, sm: 8, md: 12, lg: 16 }}>
							<Typography variant="h3" sx={{ fontWeight: "bold" }}>
								{t("patron_request.virtual_patron")}
							</Typography>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("patron_request.local_id")}
								</Typography>
								<RenderAttribute
									attribute={
										patronRequest?.suppliers[0]?.virtualPatron?.localId
									}
								/>
							</Stack>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("patron_request.local_barcode")}
								</Typography>
								<RenderAttribute
									attribute={
										patronRequest?.suppliers[0]?.virtualPatron?.localBarcode
									}
								/>
							</Stack>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("patron_request.borrowing_patron_type")}
								</Typography>
								<RenderAttribute
									attribute={
										patronRequest?.suppliers[0]?.virtualPatron?.localPtype
									}
								/>
							</Stack>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{"DCB patron type"}
								</Typography>
								<RenderAttribute
									attribute={
										patronRequest?.suppliers[0]?.virtualPatron?.canonicalPtype
									}
								/>
							</Stack>
						</Grid>
					</Grid>
				</TabPanel>
				<TabPanel value={3}>
					<Grid
						container
						spacing={{ xs: 2, md: 3 }}
						columns={{ xs: 3, sm: 6, md: 9, lg: 12 }}>
						<Grid size={{ xs: 4, sm: 8, md: 12, lg: 16 }}>
							<Typography variant="accordionSummary">
								{t("patron_request.borrowing", "Borrowing")}
							</Typography>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("hostlms.code")}
								</Typography>
								<RenderAttribute attribute={patronRequest?.patronHostlmsCode} />
							</Stack>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("patron_request.borrowing_request_id")}
								</Typography>
								<RenderAttribute attribute={patronRequest?.localRequestId} />
							</Stack>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("patron_request.borrowing_request_status")}
								</Typography>
								<RenderAttribute
									attribute={patronRequest?.localRequestStatus}
								/>
							</Stack>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("patron_request.borrowing_request_status_raw")}
								</Typography>
								<RenderAttribute
									attribute={patronRequest?.rawLocalRequestStatus}
								/>
							</Stack>
						</Grid>

						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("patron_request.borrowing_patron_id")}
								</Typography>
								<RenderAttribute
									attribute={patronRequest?.requestingIdentity?.localId}
								/>
							</Stack>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("patron_request.borrowing_patron_barcode")}
								</Typography>
								<RenderAttribute
									attribute={patronRequest?.requestingIdentity?.localBarcode}
								/>
							</Stack>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("patron_request.borrowing_patron_type")}
								</Typography>
								<RenderAttribute
									attribute={patronRequest?.requestingIdentity?.localPtype}
								/>
							</Stack>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("patron_request.patron_canonical_ptype")}
								</Typography>
								<RenderAttribute
									attribute={patronRequest?.requestingIdentity?.canonicalPtype}
								/>
							</Stack>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("patron_request.patron_uuid")}
								</Typography>
								<RenderAttribute attribute={patronRequest?.patron?.id} />
							</Stack>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("patron_request.requestor_uuid")}
								</Typography>
								<RenderAttribute
									attribute={patronRequest?.requestingIdentity?.id}
								/>
							</Stack>
						</Grid>

						<Grid size={{ xs: 4, sm: 8, md: 12, lg: 16 }} mb={1} mt={1}>
							<Divider aria-hidden="true"></Divider>
						</Grid>
						<Grid size={{ xs: 4, sm: 8, md: 12, lg: 16 }}>
							<Typography variant="h3" sx={{ fontWeight: "bold" }}>
								{t("patron_request.virtual_item")}
							</Typography>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("patron_request.borrowing_virtual_id")}
								</Typography>
								<RenderAttribute attribute={patronRequest?.localItemId} />
							</Stack>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("patron_request.borrowing_virtual_type")}
								</Typography>
								<RenderAttribute attribute={patronRequest?.localItemType} />
							</Stack>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("patron_request.borrowing_virtual_item_status")}
								</Typography>
								<RenderAttribute attribute={patronRequest?.localItemStatus} />
							</Stack>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("patron_request.borrowing_virtual_item_status_raw")}
								</Typography>
								<RenderAttribute
									attribute={patronRequest?.rawLocalItemStatus}
								/>
							</Stack>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("patron_request.borrowing_virtual_bib_id")}
								</Typography>
								<RenderAttribute attribute={patronRequest?.localBibId} />
							</Stack>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("patron_request.renewal_count_borrower")}
								</Typography>
								<RenderAttribute
									attribute={patronRequest?.localRenewalCount?.toString()}
								/>
							</Stack>
						</Grid>
					</Grid>
				</TabPanel>
				<TabPanel value={4}>
					<Grid
						container
						spacing={{ xs: 2, md: 3 }}
						columns={{ xs: 3, sm: 6, md: 9, lg: 12 }}>
						<Grid size={{ xs: 4, sm: 8, md: 12, lg: 16 }}>
							<Typography variant="accordionSummary">
								{t("patron_request.pickup")}
							</Typography>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("patron_request.pickup_location_name")}
								</Typography>
								{pickupLocationDataLoading ? (
									<CircularProgress
										color="inherit"
										size={13}
										sx={{ marginLeft: "10px" }}
									/>
								) : pickupLocationDataError ? (
									t("patron_request.error_pickup")
								) : auth?.user?.profile?.roles?.includes("LIBRARY_ADMIN") ? (
									<Tooltip title={t("location.view_location")}>
										<CustomLink to={`/locations/${pickupLocation?.id}`}>
											{pickupLocation?.name}
										</CustomLink>
									</Tooltip>
								) : (
									<RenderAttribute attribute={pickupLocation?.name} />
								)}
							</Stack>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("patron_request.pickup_request_id")}
								</Typography>
								<RenderAttribute attribute={patronRequest?.pickupRequestId} />
							</Stack>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("patron_request.pickup_request_status")}
								</Typography>
								<RenderAttribute
									attribute={patronRequest?.pickupRequestStatus}
								/>
							</Stack>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("patron_request.pickup_request_status_raw")}
								</Typography>
								<RenderAttribute
									attribute={patronRequest?.rawPickupRequestStatus}
								/>
							</Stack>
						</Grid>
						<Grid size={{ xs: 4, sm: 8, md: 12, lg: 16 }} mb={1} mt={1}>
							<Divider aria-hidden="true"></Divider>
						</Grid>
						<Grid size={{ xs: 4, sm: 8, md: 12, lg: 16 }}>
							<Typography variant="h3" sx={{ fontWeight: "bold" }}>
								{t("patron_request.virtual_patron")}
							</Typography>
						</Grid>

						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("patron_request.pickup_patron_id")}
								</Typography>
								<RenderAttribute attribute={patronRequest?.pickupPatronId} />
							</Stack>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("patron_request.local_barcode")}
								</Typography>
								{patronIdentitiesLoading ? (
									<CircularProgress
										color="inherit"
										size={13}
										sx={{ marginLeft: "10px" }}
									/>
								) : (
									<RenderAttribute
										attribute={
											patronIdentitiesError
												? t("patron_request..error_identities")
												: pickupPatronIdentity?.localBarcode
										}
									/>
								)}
							</Stack>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("patron_request.borrowing_patron_type")}
								</Typography>
								{patronIdentitiesLoading ? (
									<CircularProgress
										color="inherit"
										size={13}
										sx={{ marginLeft: "10px" }}
									/>
								) : (
									<RenderAttribute
										attribute={
											patronIdentitiesError
												? t("patron_request..error_identities")
												: pickupPatronIdentity?.localPtype
										}
									/>
								)}
							</Stack>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("patron_request.patron_type_dcb")}
								</Typography>
								{patronIdentitiesLoading ? (
									<CircularProgress
										color="inherit"
										size={13}
										sx={{ marginLeft: "10px" }}
									/>
								) : (
									<RenderAttribute
										attribute={
											patronIdentitiesError
												? t("patron_request..error_identities")
												: pickupPatronIdentity?.canonicalPtype
										}
									/>
								)}
							</Stack>
						</Grid>
						<Grid size={{ xs: 4, sm: 8, md: 12, lg: 16 }} mb={1} mt={1}>
							<Divider aria-hidden="true"></Divider>
						</Grid>
						<Grid size={{ xs: 4, sm: 8, md: 12, lg: 16 }}>
							<Typography variant="h3" sx={{ fontWeight: "bold" }}>
								{t("patron_request.virtual_item")}
							</Typography>
						</Grid>

						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("patron_request.pickup_item_id")}
								</Typography>
								<RenderAttribute attribute={patronRequest?.pickupItemId} />
							</Stack>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("patron_request.pickup_item_type")}
								</Typography>
								<RenderAttribute attribute={patronRequest?.pickupItemType} />
							</Stack>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("patron_request.pickup_item_status")}
								</Typography>
								<RenderAttribute attribute={patronRequest?.pickupItemStatus} />
							</Stack>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("patron_request.pickup_item_status_raw")}
								</Typography>
								<RenderAttribute
									attribute={patronRequest?.rawPickupItemStatus}
								/>
							</Stack>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("patron_request.pickup_bib_id")}
								</Typography>
								<RenderAttribute attribute={patronRequest?.pickupBibId} />
							</Stack>
						</Grid>
					</Grid>
				</TabPanel>

				<TabPanel value={5}>
					<Typography id="auditlog" variant="accordionSummary">
						{t("audit.log")}
					</Typography>
					<DataGrid
						disablePivoting
						rows={patronRequest?.audit ?? []}
						columns={[
							{
								field: "auditDate",
								headerName: "Audit date",
								minWidth: 60,
								flex: 0.2,
								editable: false,
								filterable: true,
								sortable: true,
								valueGetter: (value: string, row: { auditDate: string }) => {
									const auditDate = row.auditDate;
									return dayjs(auditDate).format("YYYY-MM-DD HH:mm:ss.SSS");
								},
							},
							{
								field: "briefDescription",
								headerName: "Description",
								minWidth: 100,
								flex: 0.4,
							},
							{
								field: "fromStatus",
								headerName: "fromStatus",
								minWidth: 50,
								flex: 0.25,
							},
							{
								field: "toStatus",
								headerName: "toStatus",
								minWidth: 50,
								flex: 0.25,
							},
						]}
						type="audits"
						identifier="AuditPatronRequestDetails"
						// This grid could show click-through details of its own for each audit log entry
						checkboxSelection={false}
						// noDataTitle={t("patron_request.audit_log_no_data")}
						// noDataMessage={t("patron_request.audit_log_no_rows")}
						// sortModel={[{ field: "auditDate", sort: "desc" }]}
						// operationDataType="Audit"
						filterMode="client"
						filterModel={currentFilter}
						onFilterModelChange={(newModel) =>
							setAuditFilterModel(auditGridId, newModel)
						}
						disableAggregation={true}
						disableHoverInteractions={true}
						disableRowGrouping={true}
						loading={patronRequestLoading}
						listViewEnabled={false}
						noResultsText={t("audit.no_results")}
						pagination
						paginationMode="client"
						paginationModel={currentPagination}
						onPaginationModelChange={(newModel: GridPaginationModel) =>
							setAuditPaginationModel(auditGridId, newModel)
						}
						pivotingEnabled={false}
						onRowModesModelChange={setRowModesModel}
						toolbarVisible
						rowModesModel={rowModesModel}
						searchText="Search by audit"
						scrollbarVisible={false}
						sortingMode="client"
						sortModel={currentSort}
						onSortModelChange={(newModel) =>
							setAuditSortModel(auditGridId, newModel)
						}
					/>
				</TabPanel>
			</TabContext>
		</>
	);
}
