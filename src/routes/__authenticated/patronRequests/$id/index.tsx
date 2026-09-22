import { currentClock, useClock } from "@/hooks/useThemeStore";
import { formatTimestamp } from "@helpers/formatters";
import { Attribute } from "@components/Attribute/Attribute";
import i18n from "@/i18n";
import { pageTitle } from "@helpers/pageTitle";
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
	Tab,
	Tooltip,
	Typography,
} from "@mui/material";
import { getPatronIdentities } from "@queries/getPatronIdentities";
import { getPatronRequest } from "@queries/getPatronRequest";
import { isAgencyScopedRequestsEnabled } from "@helpers/featureFlags";
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
import { Agency } from "@models/Agency";
import { HostLMS } from "@models/HostLMS";
import { getHostLms } from "@queries/getHostLms";
import { getAgency } from "@queries/getAgency";
import { cleanupStatuses } from "@constants/statuses/cleanupStatuses";
import { untrackedStatuses } from "@constants/statuses/untrackedStatuses";
import { useGridStore } from "@/hooks/useDataGridStore";

export const Route = createFileRoute("/__authenticated/patronRequests/$id/")({
	head: () => ({ meta: [{ title: pageTitle("patron_request.title") }] }),
	component: RouteComponent,
});

function RouteComponent() {
	const { id } = Route.useParams();
	const { cfg } = useRouter().options.context as { cfg: any };
	const { t } = useTranslation();
	const clock = useClock();

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
				getPatronRequest(),
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

	const pickupLibraries: Library[] =
		pickupLibraryData?.libraries?.content ?? [];
	const pickupLibrary = pickupLibraries?.[0];

	// The borrowing library. Two ways to reach it, because the field that makes the
	// direct one possible does not exist before dcb-service 9.0.0.
	//
	// resolvedAgency is the agency the patron identity was resolved to during patron
	// validation, so it names the library itself. The chain below instead asks which
	// agencies sit on the patron's Host LMS and takes the first alphabetically: right on
	// a system serving one library, and on a shared one it returns every co-tenant and
	// picks an arbitrary one - so the page showed the wrong library, and then rendered
	// that library's contact details, which belong to somebody unconnected to the
	// request. The chain is kept rather than deleted because it is what an older
	// deployment has; the flag is how such a deployment stops being wrong.
	const agencyScoped = isAgencyScopedRequestsEnabled();
	const resolvedAgency: Agency | null | undefined =
		patronRequest?.requestingIdentity?.resolvedAgency;

	// Patron library is a little harder ...
	// Get Host LMS code, ID, then agency, then library
	const {
		data: patronLmsData,
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
		enabled: !agencyScoped && !!patronRequest?.patronHostlmsCode,
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

	const patronHostLms: HostLMS = patronHostLmss?.[0];

	const {
		data: patronAgencyData,
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
		enabled: !agencyScoped && !!patronHostLms?.id,
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

	// Which we can then use to get library. When we combine library and agency we can eliminate this but for now we're stuck with it
	const patronAgencies = patronAgencyData?.agencies?.content ?? [];
	const patronAgency: Agency | null | undefined = agencyScoped
		? resolvedAgency
		: patronAgencies?.[0];

	const {
		data: patronLibraryData,
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
		onError: () => {
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
		onError: () => {
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
					goBack="/patronRequests"
				/>
			) : (
				<Error
					title={t("ui.feedback.error.cannot_find_record")}
					message={t("ui.feedback.error.invalid_UUID")}
					description={t("ui.info.check_address")}
					action={t("ui.actions.go_back")}
					goBack="/patronRequests"
				/>
			)}
		</>
	) : (
		<>
			<Typography
                variant="h1"
                sx={{
                    mb: 3,
                    mt: 3
                }}>
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
								<Attribute label={t("patron_request.patron_library")}>
									<Tooltip
										title={t("patron_request.request_tooltip", {
											ils: getILS(
												patronLibrary?.agency?.hostLms?.lmsClientClass,
											),
											contact: patronLibrary?.contacts
												? findPrimaryContacts(patronLibrary?.contacts)
												: t("library.no_contact"),
										})}>
										<span>
											<RenderAttribute attribute={patronLibrary?.fullName} />
										</span>
									</Tooltip>
								</Attribute>
							</Grid>
						) : patronLibraryLoading ||
					  patronLmsLoading ||
					  patronAgencyLoading ? (
							<CircularProgress size="1rem" />
						) : null}
						{supplierLibrary?.fullName ? (
							<Grid size={{ xs: 2, sm: 4, md: 4 }}>
								<Attribute label={t("patron_request.supplier_library")}>
									<Tooltip
										title={t("patron_request.request_tooltip", {
											ils: getILS(
												supplierLibrary?.agency?.hostLms?.lmsClientClass,
											),
											contact: supplierLibrary?.contacts
												? findPrimaryContacts(supplierLibrary?.contacts)
												: t("library.no_contact"),
										})}>
										<span>
											<RenderAttribute attribute={supplierLibrary?.fullName} />
										</span>
									</Tooltip>
								</Attribute>
							</Grid>
						) : supplierLibraryLoading ? (
							<CircularProgress size="1rem" />
						) : null}
						{pickupLibrary?.fullName ? (
							<Grid size={{ xs: 2, sm: 4, md: 4 }}>
								<Attribute label={t("patron_request.pickup_library")}>
									<Tooltip
										title={t("patron_request.request_tooltip", {
											ils: getILS(
												pickupLibrary?.agency?.hostLms?.lmsClientClass,
											),
											contact: pickupLibrary?.contacts
												? findPrimaryContacts(pickupLibrary?.contacts)
												: t("library.no_contact"),
										})}>
										<span>
											<RenderAttribute attribute={pickupLibrary?.fullName} />
										</span>
									</Tooltip>
								</Attribute>
							</Grid>
						) : pickupLibraryLoading ? (
							<CircularProgress size="1rem" />
						) : null}

						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Attribute label={t("patron_request.patron_hostlms")}>
								<RenderAttribute attribute={patronRequest?.patronHostlmsCode} />
							</Attribute>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Attribute label={t("patron_request.borrowing_patron_barcode")}>
								<RenderAttribute
									attribute={patronRequest?.requestingIdentity?.localBarcode}
								/>
							</Attribute>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Attribute label={t("patron_request.supplying_agency_code")}>
								<RenderAttribute
									attribute={patronRequest?.suppliers[0]?.localAgency}
								/>
							</Attribute>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Attribute label={t("patron_request.pickup_agency_code")}>
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
												? t("patron_request.error_pickup")
												: pickupLocation?.agency?.code
										}
									/>
								)}
							</Attribute>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Attribute label={t("patron_request.pickup_hostlms_code")}>
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
												? t("patron_request.error_pickup")
												: pickupLocation?.hostSystem?.code
										}
									/>
								)}
							</Attribute>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Attribute label={t("patron_request.pickup_location_name")}>
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
							</Attribute>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Attribute label={t("patron_request.request_created")}>
								<RenderAttribute
									attribute={formatTimestamp(patronRequest?.dateCreated, clock)}
								/>
							</Attribute>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Attribute label={t("patron_request.request_updated")}>
								<RenderAttribute
									attribute={formatTimestamp(patronRequest?.dateUpdated, clock)}
								/>
							</Attribute>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Attribute label={t("patron_request.next_poll")}>
								<RenderAttribute
									attribute={formatTimestamp(patronRequest?.nextScheduledPoll, clock)}
								/>
							</Attribute>
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
							<Attribute label={t("patron_request.previous_status")}>
								<RenderAttribute attribute={patronRequest?.previousStatus} />
							</Attribute>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Attribute label={t("patron_request.status")}>
								<RenderAttribute attribute={patronRequest?.status} />
							</Attribute>
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
							<Attribute label={t("patron_request.next_expected_status")}>
								<RenderAttribute
									attribute={patronRequest?.nextExpectedStatus?.toString()}
								/>
							</Attribute>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Attribute label={t("patron_request.status_changed")}>
								<RenderAttribute
									attribute={dayjs(
										patronRequest?.currentStatusTimestamp,
									).format("YYYY-MM-DD HH:mm:ss.SSS")}
								/>
							</Attribute>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Attribute label={t("patron_request.time_in_status")}>
								<RenderAttribute
									attribute={formatDuration(
										patronRequest?.elapsedTimeInCurrentStatus,
									)}
								/>
							</Attribute>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Attribute label={t("patron_request.polling_checks_in_status")}>
								<RenderAttribute
									attribute={patronRequest?.pollCountForCurrentStatus?.toString()}
								/>
							</Attribute>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Attribute label={t("patron_request.active_workflow")}>
								<RenderAttribute attribute={patronRequest?.activeWorkflow} />
							</Attribute>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Attribute label={t("patron_request.out_of_sequence")}>
								<RenderAttribute
									attribute={patronRequest?.outOfSequenceFlag?.toString()}
								/>
							</Attribute>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Attribute label={t("patron_request.resolution_count")}>
								<RenderAttribute
									attribute={patronRequest?.resolutionCount?.toString()}
								/>
							</Attribute>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Attribute label={t("patron_request.renewal_status")}>
								<RenderAttribute attribute={patronRequest?.renewalStatus} />
							</Attribute>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Attribute label={t("patron_request.renewal_count")}>
								<RenderAttribute
									attribute={patronRequest?.renewalCount?.toString()}
								/>
							</Attribute>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Attribute label={t("patron_request.error_message")}>
								<RenderAttribute attribute={patronRequest?.errorMessage} />
							</Attribute>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Attribute label={t("patron_request.requestor_note")}>
								<RenderAttribute attribute={patronRequest?.requesterNote} />
							</Attribute>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Attribute label={t("patron_request.description")}>
								<RenderAttribute attribute={patronRequest?.description} />
							</Attribute>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Attribute label={t("patron_request.request_uuid")}>
								<RenderAttribute attribute={patronRequest?.id} />
							</Attribute>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Attribute label={t("requesting.expedited_checkout.request_title")}>
								<RenderAttribute
									attribute={patronRequest?.isExpeditedCheckout}
								/>
							</Attribute>
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
							<Attribute label={t("bibs.record_title")}>
								<RenderAttribute
									attribute={patronRequest?.clusterRecord?.title}
								/>
							</Attribute>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Attribute label={t("bibs.record_created")}>
								<RenderAttribute
									attribute={dayjs(
										patronRequest?.clusterRecord?.dateCreated,
									).format("YYYY-MM-DD HH:mm")}
								/>
							</Attribute>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Attribute label={t("bibs.record_updated")}>
								<RenderAttribute
									attribute={dayjs(
										patronRequest?.clusterRecord?.dateUpdated,
									).format("YYYY-MM-DD HH:mm")}
								/>
							</Attribute>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Attribute label={t("bibs.cluster_uuid")}>
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
							</Attribute>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Attribute label={t("bibs.selected_bib_uuid")}>
								<RenderAttribute
									attribute={patronRequest?.clusterRecord?.selectedBib}
								/>
							</Attribute>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Attribute label={t("bibs.source_record_id")}>
								<RenderAttribute
									attribute={
										patronRequest?.clusterRecord?.members[0]?.sourceRecordId
									}
								/>
							</Attribute>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Attribute label={t("bibs.source_system_id")}>
								<RenderAttribute
									attribute={
										patronRequest?.clusterRecord?.members[0]?.sourceSystemId
									}
								/>
							</Attribute>
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
							<Attribute label={t("patron_request.supplying_agency_code")}>
								<RenderAttribute
									attribute={patronRequest?.suppliers[0]?.localAgency}
								/>
							</Attribute>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Attribute label={t("hostlms.code")}>
								<RenderAttribute
									attribute={patronRequest?.suppliers[0]?.hostLmsCode}
								/>
							</Attribute>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Attribute label={t("patron_request.active")}>
								<RenderAttribute
									attribute={String(patronRequest?.suppliers[0]?.isActive)}
								/>
							</Attribute>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Attribute label={t("patron_request.date_created")}>
								<RenderAttribute
									attribute={dayjs(
										patronRequest?.suppliers[0]?.dateCreated,
									).format("YYYY-MM-DD HH:mm")}
								/>
							</Attribute>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Attribute label={t("patron_request.date_updated")}>
								<RenderAttribute
									attribute={dayjs(
										patronRequest?.suppliers[0]?.dateUpdated,
									).format("YYYY-MM-DD HH:mm")}
								/>
							</Attribute>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Attribute label={t("patron_request.local_request_status")}>
								<RenderAttribute
									attribute={patronRequest?.suppliers[0]?.localStatus}
								/>
							</Attribute>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Attribute label={t("patron_request.local_request_status_raw")}>
								<RenderAttribute
									attribute={patronRequest?.suppliers[0]?.rawLocalStatus}
								/>
							</Attribute>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Attribute label={t("patron_request.supplier_uuid")}>
								<RenderAttribute attribute={patronRequest?.suppliers[0]?.id} />
							</Attribute>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Attribute label={t("patron_request.local_bib_id")}>
								<RenderAttribute
									attribute={patronRequest?.suppliers[0]?.localBibId}
								/>
							</Attribute>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Attribute label={t("patron_request.local_supplier_id")}>
								<RenderAttribute
									attribute={patronRequest?.suppliers[0]?.localId}
								/>
							</Attribute>
						</Grid>
					</Grid>

					<Grid
						container
						spacing={{ xs: 2, md: 3 }}
						columns={{ xs: 3, sm: 6, md: 9, lg: 12 }}>
						<Grid
                            size={{ xs: 4, sm: 8, md: 12, lg: 16 }}
                            sx={{
                                mb: 1,
                                mt: 1
                            }}>
							<Divider aria-hidden="true"></Divider>
						</Grid>
						<Grid size={{ xs: 4, sm: 8, md: 12, lg: 16 }}>
							<Typography variant="h3" sx={{ fontWeight: "bold" }}>
								{t("patron_request.item")}
							</Typography>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Attribute label={t("patron_request.local_item_barcode")}>
								<RenderAttribute
									attribute={patronRequest?.suppliers[0]?.localItemBarcode}
								/>
							</Attribute>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Attribute label={t("patron_request.local_item_loc")}>
								<RenderAttribute
									attribute={patronRequest?.suppliers[0]?.localItemLocationCode}
								/>
							</Attribute>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Attribute label={t("patron_request.local_item_status")}>
								<RenderAttribute
									attribute={patronRequest?.suppliers[0]?.localItemStatus}
								/>
							</Attribute>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Attribute label={t("patron_request.local_item_status_raw")}>
								<RenderAttribute
									attribute={patronRequest?.suppliers[0]?.rawLocalItemStatus}
								/>
							</Attribute>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Attribute label={t("patron_request.renewal_count_supplier")}>
								<RenderAttribute
									attribute={patronRequest?.suppliers[0]?.localRenewalCount?.toString()}
								/>
							</Attribute>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Attribute label={t("patron_request.local_item_type")}>
								<RenderAttribute
									attribute={patronRequest?.suppliers[0]?.localItemType}
								/>
							</Attribute>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Attribute label={t("patron_request.supplier_ctype")}>
								<RenderAttribute
									attribute={patronRequest?.suppliers[0]?.canonicalItemType}
								/>
							</Attribute>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Attribute label={t("patron_request.local_item_id")}>
								<RenderAttribute
									attribute={patronRequest?.suppliers[0]?.localItemId}
								/>
							</Attribute>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Attribute label={t("patron_request.item_manually_selected")}>
								<RenderAttribute
									attribute={patronRequest.isManuallySelectedItem?.toString()}
								/>
							</Attribute>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Attribute label={t("patron_request.item_manual_agency_code")}>
								<RenderAttribute
									attribute={patronRequest?.localItemAgencyCode}
								/>
							</Attribute>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Attribute label={t("patron_request.item_manual_hostlms_code")}>
								<RenderAttribute
									attribute={patronRequest?.localItemHostlmsCode}
								/>
							</Attribute>
						</Grid>
					</Grid>

					<Grid
						container
						spacing={{ xs: 2, md: 3 }}
						columns={{ xs: 3, sm: 6, md: 9, lg: 12 }}>
						<Grid
                            size={{ xs: 4, sm: 8, md: 12, lg: 16 }}
                            sx={{
                                mb: 1,
                                mt: 1
                            }}>
							<Divider aria-hidden="true"></Divider>
						</Grid>
						<Grid size={{ xs: 4, sm: 8, md: 12, lg: 16 }}>
							<Typography variant="h3" sx={{ fontWeight: "bold" }}>
								{t("patron_request.virtual_patron")}
							</Typography>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Attribute label={t("patron_request.local_id")}>
								<RenderAttribute
									attribute={
										patronRequest?.suppliers[0]?.virtualPatron?.localId
									}
								/>
							</Attribute>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Attribute label={t("patron_request.local_barcode")}>
								<RenderAttribute
									attribute={
										patronRequest?.suppliers[0]?.virtualPatron?.localBarcode
									}
								/>
							</Attribute>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Attribute label={t("patron_request.borrowing_patron_type")}>
								<RenderAttribute
									attribute={
										patronRequest?.suppliers[0]?.virtualPatron?.localPtype
									}
								/>
							</Attribute>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Attribute label={"DCB patron type"}>
								<RenderAttribute
									attribute={
										patronRequest?.suppliers[0]?.virtualPatron?.canonicalPtype
									}
								/>
							</Attribute>
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
							<Attribute label={t("hostlms.code")}>
								<RenderAttribute attribute={patronRequest?.patronHostlmsCode} />
							</Attribute>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Attribute label={t("patron_request.borrowing_request_id")}>
								<RenderAttribute attribute={patronRequest?.localRequestId} />
							</Attribute>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Attribute label={t("patron_request.borrowing_request_status")}>
								<RenderAttribute
									attribute={patronRequest?.localRequestStatus}
								/>
							</Attribute>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Attribute label={t("patron_request.borrowing_request_status_raw")}>
								<RenderAttribute
									attribute={patronRequest?.rawLocalRequestStatus}
								/>
							</Attribute>
						</Grid>

						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Attribute label={t("patron_request.borrowing_patron_id")}>
								<RenderAttribute
									attribute={patronRequest?.requestingIdentity?.localId}
								/>
							</Attribute>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Attribute label={t("patron_request.borrowing_patron_barcode")}>
								<RenderAttribute
									attribute={patronRequest?.requestingIdentity?.localBarcode}
								/>
							</Attribute>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Attribute label={t("patron_request.borrowing_patron_type")}>
								<RenderAttribute
									attribute={patronRequest?.requestingIdentity?.localPtype}
								/>
							</Attribute>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Attribute label={t("patron_request.patron_canonical_ptype")}>
								<RenderAttribute
									attribute={patronRequest?.requestingIdentity?.canonicalPtype}
								/>
							</Attribute>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Attribute label={t("patron_request.patron_uuid")}>
								<RenderAttribute attribute={patronRequest?.patron?.id} />
							</Attribute>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Attribute label={t("patron_request.requestor_uuid")}>
								<RenderAttribute
									attribute={patronRequest?.requestingIdentity?.id}
								/>
							</Attribute>
						</Grid>

						<Grid
                            size={{ xs: 4, sm: 8, md: 12, lg: 16 }}
                            sx={{
                                mb: 1,
                                mt: 1
                            }}>
							<Divider aria-hidden="true"></Divider>
						</Grid>
						<Grid size={{ xs: 4, sm: 8, md: 12, lg: 16 }}>
							<Typography variant="h3" sx={{ fontWeight: "bold" }}>
								{t("patron_request.virtual_item")}
							</Typography>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Attribute label={t("patron_request.borrowing_virtual_id")}>
								<RenderAttribute attribute={patronRequest?.localItemId} />
							</Attribute>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Attribute label={t("patron_request.borrowing_virtual_type")}>
								<RenderAttribute attribute={patronRequest?.localItemType} />
							</Attribute>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Attribute label={t("patron_request.borrowing_virtual_item_status")}>
								<RenderAttribute attribute={patronRequest?.localItemStatus} />
							</Attribute>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Attribute label={t("patron_request.borrowing_virtual_item_status_raw")}>
								<RenderAttribute
									attribute={patronRequest?.rawLocalItemStatus}
								/>
							</Attribute>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Attribute label={t("patron_request.borrowing_virtual_bib_id")}>
								<RenderAttribute attribute={patronRequest?.localBibId} />
							</Attribute>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Attribute label={t("patron_request.renewal_count_borrower")}>
								<RenderAttribute
									attribute={patronRequest?.localRenewalCount?.toString()}
								/>
							</Attribute>
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
							<Attribute label={t("patron_request.pickup_location_name")}>
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
							</Attribute>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Attribute label={t("patron_request.pickup_request_id")}>
								<RenderAttribute attribute={patronRequest?.pickupRequestId} />
							</Attribute>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Attribute label={t("patron_request.pickup_request_status")}>
								<RenderAttribute
									attribute={patronRequest?.pickupRequestStatus}
								/>
							</Attribute>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Attribute label={t("patron_request.pickup_request_status_raw")}>
								<RenderAttribute
									attribute={patronRequest?.rawPickupRequestStatus}
								/>
							</Attribute>
						</Grid>
						<Grid
                            size={{ xs: 4, sm: 8, md: 12, lg: 16 }}
                            sx={{
                                mb: 1,
                                mt: 1
                            }}>
							<Divider aria-hidden="true"></Divider>
						</Grid>
						<Grid size={{ xs: 4, sm: 8, md: 12, lg: 16 }}>
							<Typography variant="h3" sx={{ fontWeight: "bold" }}>
								{t("patron_request.virtual_patron")}
							</Typography>
						</Grid>

						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Attribute label={t("patron_request.pickup_patron_id")}>
								<RenderAttribute attribute={patronRequest?.pickupPatronId} />
							</Attribute>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Attribute label={t("patron_request.local_barcode")}>
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
												? t("patron_request.error_identities")
												: pickupPatronIdentity?.localBarcode
										}
									/>
								)}
							</Attribute>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Attribute label={t("patron_request.borrowing_patron_type")}>
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
												? t("patron_request.error_identities")
												: pickupPatronIdentity?.localPtype
										}
									/>
								)}
							</Attribute>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Attribute label={t("patron_request.patron_type_dcb")}>
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
												? t("patron_request.error_identities")
												: pickupPatronIdentity?.canonicalPtype
										}
									/>
								)}
							</Attribute>
						</Grid>
						<Grid
                            size={{ xs: 4, sm: 8, md: 12, lg: 16 }}
                            sx={{
                                mb: 1,
                                mt: 1
                            }}>
							<Divider aria-hidden="true"></Divider>
						</Grid>
						<Grid size={{ xs: 4, sm: 8, md: 12, lg: 16 }}>
							<Typography variant="h3" sx={{ fontWeight: "bold" }}>
								{t("patron_request.virtual_item")}
							</Typography>
						</Grid>

						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Attribute label={t("patron_request.pickup_item_id")}>
								<RenderAttribute attribute={patronRequest?.pickupItemId} />
							</Attribute>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Attribute label={t("patron_request.pickup_item_type")}>
								<RenderAttribute attribute={patronRequest?.pickupItemType} />
							</Attribute>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Attribute label={t("patron_request.pickup_item_status")}>
								<RenderAttribute attribute={patronRequest?.pickupItemStatus} />
							</Attribute>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Attribute label={t("patron_request.pickup_item_status_raw")}>
								<RenderAttribute
									attribute={patronRequest?.rawPickupItemStatus}
								/>
							</Attribute>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Attribute label={t("patron_request.pickup_bib_id")}>
								<RenderAttribute attribute={patronRequest?.pickupBibId} />
							</Attribute>
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
								headerName: i18n.t("grid.headers.audit_date"),
								minWidth: 60,
								flex: 0.2,
								editable: false,
								filterable: true,
								sortable: true,
								valueGetter: (value: string, row: { auditDate: string }) => {
									const auditDate = row.auditDate;
									return formatTimestamp(auditDate, currentClock(), { precise: true });
								},
							},
							{
								field: "briefDescription",
								headerName: i18n.t("grid.headers.description"),
								minWidth: 100,
								flex: 0.4,
							},
							{
								field: "fromStatus",
								headerName: i18n.t("grid.headers.fromstatus"),
								minWidth: 50,
								flex: 0.25,
							},
							{
								field: "toStatus",
								headerName: i18n.t("grid.headers.tostatus"),
								minWidth: 50,
								flex: 0.25,
							},
						]}
						type="audits"
						label={t("patron_request.audit_log")}
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
						searchText={t("ui.data_grid.search_audits")}
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
