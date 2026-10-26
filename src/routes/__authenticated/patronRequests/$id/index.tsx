import { validateGridSearch } from "@helpers/viewState/gridSearch";
import { auditLogView } from "@helpers/viewState/gridViewIds";
import { useClock } from "@/hooks/useThemeStore";
import { formatTimestamp } from "@helpers/formatters";
import { Attribute } from "@components/Attribute/Attribute";
import { pageTitle } from "@helpers/pageTitle";
import Error from "@components/Error/Error";
import RenderAttribute from "@components/RenderAttribute/RenderAttribute";
import {
	AgencyQueryData,
	HostLmsQueryData,
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
	Box,
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
import {
	isAgencyScopedRequestsEnabled,
	isConfirmItemReturnedEnabled,
	isGuardedCleanupEnabled,
	isRequestTagsEnabled,
} from "@helpers/featureFlags";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import axios from "axios";
import request from "graphql-request";
import { lazy, Suspense, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "react-oidc-context";
import { isUuidShaped } from "@helpers/isUuidShaped";
import { OPTIONAL_QUERY } from "@helpers/serviceErrors";
import { onlyMatch } from "@helpers/onlyMatch";
import TimedAlert from "@components/TimedAlert/TimedAlert";
import Confirmation from "@components/Confirmation/Confirmation";
import ExpandMore from "@mui/icons-material/ExpandMore";
import { formatDuration } from "@helpers/formatDuration";
import Loading from "@components/Loading/Loading";
import { DETAIL_COLUMNS, FULL_ROW, WRAPPED_PRE, DETAIL_ITEM } from "@constants/detailGrid";
import { CustomLink } from "@components/CustomLink";
import { SourceRecord } from "@models/SourceRecord";
import { queryKeys } from "@helpers/queryKeys";
import { authHeaders } from "@helpers/auth";
import {
	libraryBasicsQueryOptions,
	locationQueryOptions,
	invalidateRequestLists,
} from "@helpers/sharedQueries";
import { Library } from "@models/Library";
import { getILS } from "@helpers/getILS";
import { findPrimaryContacts } from "@helpers/findPrimaryContacts";
import { Agency } from "@models/Agency";
import { HostLMS } from "@models/HostLMS";
import { getHostLms } from "@queries/getHostLms";
import { getAgency } from "@queries/getAgency";
import {
	cleanupPatronRequest,
	isCleanupEligible,
} from "@helpers/cleanupPatronRequest";
import { useAgencyCodes } from "@/hooks/useAgencyCodes";
import { CleanupOverrideDialog } from "@components/CleanupOverrideDialog/CleanupOverrideDialog";
import {
	confirmItemReturned,
	confirmReturnStatuses,
	isConfirmReturnEligible,
} from "@helpers/confirmItemReturned";
import { untrackedStatuses } from "@constants/statuses/untrackedStatuses";
import { dcbStatusLabel } from "@constants/statuses/DCBStatuses";
import PatronRequestAuditLog from "@components/PatronRequestAuditLog/PatronRequestAuditLog";
import { z } from "zod/mini";

const requestSearchSchema = z.object({
	// The open tab, so a shared or restored link to the audit log opens on it
	tab: z.catch(z.optional(z.int().check(z.minimum(1), z.maximum(5))), undefined),
});

/**
 * A library, with its ILS and primary contacts written out. They were a tooltip on the
 * name, which a keyboard or touch user could not reach.
 */
function LibraryWithContact({ library }: { library: Library }) {
	const { t } = useTranslation();
	return (
		<>
			<RenderAttribute attribute={library.fullName} />
			<Typography variant="body2" color="text.secondary">
				{t("patron_request.library_ils_contacts", {
					ils: getILS(library.agency?.hostLms?.lmsClientClass),
					contact: library.contacts
						? findPrimaryContacts(library.contacts)
						: t("library.no_contact"),
				})}
			</Typography>
		</>
	);
}


// Loaded with the flag: an 8.71.0 deployment never fetches it
const RequestTags = lazy(() => import("@components/RequestTags/RequestTags"));
export const Route = createFileRoute("/__authenticated/patronRequests/$id/")({
	validateSearch: (search: Record<string, unknown>) => ({
		...requestSearchSchema.parse(search),
		...validateGridSearch(search, [auditLogView.namespace ?? ""]),
	}),
	head:() => ({ meta: [{ title: pageTitle("patron_request.title") }] }),
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
	// The server's own words when it gave any, "" when it did not; null while nothing failed
	const [cleanupFailure, setCleanupFailure] = useState<string | null>(null);
	const [cleanupRefusal, setCleanupRefusal] = useState<string | null>(null);
	// The server's reason for refusing, while the user decides whether to clean up anyway
	const [overrideDetail, setOverrideDetail] = useState<string | null>(null);
	const [confirmCleanup, setConfirmCleanup] = useState(false);
	const [confirmReturnOpen, setConfirmReturnOpen] = useState(false);
	const [confirmReturnSuccess, setConfirmReturnSuccess] = useState(false);
	const [confirmReturnError, setConfirmReturnError] = useState<string | null>(null);
	const { agencyCode, agencyCodes } = useAgencyCodes();
	const guardedCleanup = isGuardedCleanupEnabled();
	const apiBase: string = cfg.VITE_DCB_API_BASE;
	const isValidId = isUuidShaped(id);

	const {
		data,
		isError,
		isLoading: patronRequestLoading,
	} = useQuery<PatronRequestQueryData>({
		queryKey: queryKeys.patronRequests.detail(apiBase, id),
		enabled: isValidId,
		queryFn: async () =>
			request(
				apiBase + "/graphql",
				getPatronRequest(),
				{
					query: "id:" + id,
					pagesize: 10,
					pageno: 0,
				},
				await authHeaders(),
			),
	});
	const patronRequest = data?.patronRequests?.content?.[0];
	const agencyScoped = isAgencyScopedRequestsEnabled();

	// Without agency scoping the borrowing library is known only by its Host LMS. Optional:
	// unanswered, clean up is offered to a supplying library alone, and the page stays.
	const { data: callerLibraryData } = useQuery({
		...libraryBasicsQueryOptions(apiBase, agencyCode ?? ""),
		meta: OPTIONAL_QUERY,
		enabled: !agencyScoped && !!agencyCode,
	});
	const canCleanup = isCleanupEligible(patronRequest, {
		guarded: guardedCleanup,
		agencyScoped,
		agencyCodes,
		hostLmsCode:
			callerLibraryData?.libraries?.content?.[0]?.agency?.hostLms?.code ?? undefined,
	});
	const members = patronRequest?.clusterRecord?.members;
	const untracked = untrackedStatuses.includes(patronRequest?.status ?? "");
	const supplier = patronRequest?.suppliers?.[0];
	const queryClient = useQueryClient();

	const linkToCluster = !!cfg.VITE_DCB_SEARCH_BASE && !!patronRequest?.bibClusterId;
	const updateUrl =
		cfg.VITE_DCB_API_BASE + "/patrons/requests/" + id + "/update";

	const {
		data: supplierLibraryData,
		isLoading: supplierLibraryLoading,
	} = useQuery({
		...libraryBasicsQueryOptions(apiBase, supplier?.localAgency ?? ""),
		enabled: !!supplier?.localAgency,
	});

	const supplierLibraries: Library[] =
		supplierLibraryData?.libraries?.content ?? [];
	const supplierLibrary = supplierLibraries?.[0];

	const {
		data: patronIdentitiesData,
		isError: patronIdentitiesError,
		isLoading: patronIdentitiesLoading,
	} = useQuery<PatronIdentitiesQueryData>({
		queryKey: queryKeys.patronIdentities.byLocalId(
			apiBase,
			patronRequest?.pickupPatronId ?? "",
		),
		enabled:
			patronRequest?.pickupPatronId != null &&
			patronRequest?.pickupPatronId != undefined,
		queryFn: async () =>
			request(
				apiBase + "/graphql",
				getPatronIdentities,
				{
					query: "localId:" + patronRequest?.pickupPatronId,
					pageno: 0,
					pagesize: 10,
					order: "localId",
					orderBy: "ASC",
				},
				await authHeaders(),
			),
	});

	const pickupPatronIdentity = onlyMatch(patronIdentitiesData?.patronIdentities);

	const {
		data: pickupLocationData,
		isError: pickupLocationDataError,
		isLoading: pickupLocationDataLoading,
	} = useQuery({
		// pickupLocationCode is the location's id (a UUID), not its code.
		...locationQueryOptions(apiBase, patronRequest?.pickupLocationCode ?? ""),
		enabled:
			patronRequest?.pickupLocationCode != null &&
			patronRequest?.pickupLocationCode != undefined,
	});

	const pickupLocation = pickupLocationData?.locations?.content?.[0];
	const {
		data: pickupLibraryData,
		isLoading: pickupLibraryLoading,
	} = useQuery({
		...libraryBasicsQueryOptions(apiBase, pickupLocation?.agency?.code ?? ""),
		enabled: !!pickupLocation?.agency?.code,
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
	const resolvedAgency: Agency | null | undefined =
		patronRequest?.requestingIdentity?.resolvedAgency;

	// Patron library is a little harder ...
	// Get Host LMS code, ID, then agency, then library
	const {
		data: patronLmsData,
		isLoading: patronLmsLoading,
	} = useQuery<HostLmsQueryData>({
		queryKey: queryKeys.hostLms.byCode(
			apiBase,
			patronRequest?.patronHostlmsCode ?? "",
		),
		enabled: !agencyScoped && !!patronRequest?.patronHostlmsCode,
		queryFn: async () =>
			request(
				apiBase + "/graphql",
				getHostLms,
				{
					query: "code:" + patronRequest?.patronHostlmsCode,
					pageno: 0,
					pagesize: 10,
					order: "name",
					orderBy: "ASC",
				},
				await authHeaders(),
			),
	});
	const patronHostLmss: HostLMS[] = patronLmsData?.hostLms?.content ?? [];

	const patronHostLms: HostLMS = patronHostLmss?.[0];

	const {
		data: patronAgencyData,
		isLoading: patronAgencyLoading,
	} = useQuery<AgencyQueryData>({
		queryKey: queryKeys.agencies.byHostLms(apiBase, patronHostLms?.id ?? ""),
		enabled: !agencyScoped && !!patronHostLms?.id,
		queryFn: async () =>
			request(
				apiBase + "/graphql",
				getAgency,
				{
					query: "hostLms:" + patronHostLms?.id,
					pageno: 0,
					pagesize: 10,
					order: "name",
					orderBy: "ASC",
				},
				await authHeaders(),
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
	} = useQuery({
		...libraryBasicsQueryOptions(apiBase, patronAgency?.code ?? ""),
		enabled: !!patronAgency?.code,
	});

	const patronLibraries: Library[] =
		patronLibraryData?.libraries?.content ?? [];
	const patronLibrary = patronLibraries?.[0];

	// The request and the grids that list it: both request grids key on these.
	const invalidateRequest = () => {
		queryClient.invalidateQueries({
			queryKey: queryKeys.patronRequests.detail(apiBase, id),
		});
		queryClient.invalidateQueries({
			queryKey: queryKeys.audits.forPatronRequestAll(apiBase, id),
		});
		void invalidateRequestLists(queryClient);
	};

	// Mutation for updating the patron request
	const updateMutation = useMutation({
		// axios rather than fetch: fetch resolves on a 4xx/5xx, which reported every refusal as success.
		mutationFn: async () =>
			axios.post(updateUrl, {}, { headers: await authHeaders() }),
		onSuccess: () => {
			invalidateRequest();
			setUpdateSuccessAlertVisibility(true);
		},
		onError: () => {
			setErrorAlertVisibility(true);
		},
	});

	// Mutation for cleaning up the patron request
	const cleanupMutation = useMutation({
		mutationFn: (override: boolean) =>
			cleanupPatronRequest(apiBase, patronRequest, {
				refreshFirst: guardedCleanup,
				override,
			}),
		// cleanupPatronRequest never throws: every answer, a server failure included, arrives here
		onSuccess: (outcome) => {
			switch (outcome.kind) {
				case "cleaned":
					invalidateRequest();
					setCleanupSuccessAlertVisibility(true);
					return;
				case "refused":
					invalidateRequest();
					if (guardedCleanup && outcome.overridable) {
						setOverrideDetail(outcome.detail ?? "");
						return;
					}
					setCleanupRefusal(outcome.detail ?? "");
					return;
				case "forbidden":
				case "notFound":
					setCleanupRefusal(t("patron_request.cleanup_not_party"));
					return;
				case "failed":
					invalidateRequest();
					setCleanupFailure(outcome.detail ?? "");
					return;
			}
		},
	});

	const confirmReturnMutation = useMutation({
		mutationFn: () => confirmItemReturned(apiBase, patronRequest?.id),
		onSuccess: (outcome) => {
			// 9.2.0 saves the item as back before it tries the release, so even a failure may have changed it
			invalidateRequest();
			switch (outcome.kind) {
				case "confirmed":
					setConfirmReturnSuccess(true);
					return;
				case "refused":
					setConfirmReturnError(
						t("patron_request.confirm_returned.refused", { detail: outcome.detail ?? "" }),
					);
					return;
				case "forbidden":
					setConfirmReturnError(t("patron_request.confirm_returned.forbidden"));
					return;
				case "failed":
					setConfirmReturnError(
						outcome.detail
							? t("patron_request.confirm_returned.unsuccessful_detail", { detail: outcome.detail })
							: t("patron_request.confirm_returned.unsuccessful"),
					);
					return;
			}
		},
	});
	const offerConfirmReturn =
		isConfirmItemReturnedEnabled() &&
		confirmReturnStatuses.includes(String(patronRequest?.status));
	const canConfirmReturn = isConfirmReturnEligible(patronRequest, agencyCodes);

	const activeTab = Route.useSearch({ select: (search) => search.tab }) ?? 0;
	const navigate = useNavigate({ from: Route.fullPath });

	const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
		void navigate({
			to: ".",
			search: (previous: z.output<typeof requestSearchSchema>) => ({
				...previous,
				tab: newValue === 0 ? undefined : newValue,
			}),
			replace: true,
			resetScroll: false,
		});
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
				{patronRequest?.clusterRecord?.title || t("patron_request.title")}
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
					<Tab value={0} label={t("patron_request.general")} />
					<Tab value={1} label={t("requesting.bib_record")} />
					<Tab value={2} label={t("patron_request.supplying")} />
					<Tab value={3} label={t("patron_request.borrowing")} />
					<Tab value={4} label={t("patron_request.pickup")} />
					<Tab value={5} label={t("audit.log")} />
				</TabList>

				<TabPanel value={0}>
					<Grid
						container
						spacing={{ xs: 2, md: 3 }}
						columns={DETAIL_COLUMNS}>
						<Grid size={FULL_ROW}>
							<Typography variant="accordionSummary">
								{t("patron_request.general")}
							</Typography>
						</Grid>
						{isRequestTagsEnabled() && patronRequest?.id ? (
							<Grid size={FULL_ROW}>
								<Suspense
									fallback={<CircularProgress size="1rem" aria-label={t("ui.info.loading.value")} />}>
									<RequestTags
										apiBase={apiBase}
										patronRequestId={patronRequest.id}
										agencyCodes={agencyCodes}
										canWrite={auth?.user?.profile?.roles?.includes("LIBRARY_ADMIN") === true}
									/>
								</Suspense>
							</Grid>
						) : null}
						{patronLibrary?.fullName ? (
							<Grid size={DETAIL_ITEM}>
								<Attribute label={t("patron_request.patron_library")}>
									<LibraryWithContact library={patronLibrary} />
								</Attribute>
							</Grid>
						) : patronLibraryLoading ||
					  patronLmsLoading ||
					  patronAgencyLoading ? (
							<CircularProgress size="1rem" aria-label={t("ui.info.loading.value")} />
						) : null}
						{supplierLibrary?.fullName ? (
							<Grid size={DETAIL_ITEM}>
								<Attribute label={t("patron_request.supplier_library")}>
									<LibraryWithContact library={supplierLibrary} />
								</Attribute>
							</Grid>
						) : supplierLibraryLoading ? (
							<CircularProgress size="1rem" aria-label={t("ui.info.loading.value")} />
						) : null}
						{pickupLibrary?.fullName ? (
							<Grid size={DETAIL_ITEM}>
								<Attribute label={t("patron_request.pickup_library")}>
									<LibraryWithContact library={pickupLibrary} />
								</Attribute>
							</Grid>
						) : pickupLibraryLoading ? (
							<CircularProgress size="1rem" aria-label={t("ui.info.loading.value")} />
						) : null}

						<Grid size={DETAIL_ITEM}>
							<Attribute label={t("patron_request.patron_hostlms")}>
								<RenderAttribute attribute={patronRequest?.patronHostlmsCode} />
							</Attribute>
						</Grid>
						<Grid size={DETAIL_ITEM}>
							<Attribute label={t("patron_request.borrowing_patron_barcode")}>
								<RenderAttribute
									attribute={patronRequest?.requestingIdentity?.localBarcode}
								/>
							</Attribute>
						</Grid>
						<Grid size={DETAIL_ITEM}>
							<Attribute label={t("patron_request.supplying_agency_code")}>
								<RenderAttribute
									attribute={supplier?.localAgency}
								/>
							</Attribute>
						</Grid>
						<Grid size={DETAIL_ITEM}>
							<Attribute label={t("patron_request.pickup_agency_code")}>
								{pickupLocationDataLoading ? (
									<CircularProgress
										color="inherit"
										size={13}
										sx={{ ml: 1 }}
										aria-label={t("ui.info.loading.value")}
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
						<Grid size={DETAIL_ITEM}>
							<Attribute label={t("patron_request.pickup_hostlms_code")}>
								{pickupLocationDataLoading ? (
									<CircularProgress
										color="inherit"
										size={13}
										sx={{ ml: 1 }}
										aria-label={t("ui.info.loading.value")}
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
						<Grid size={DETAIL_ITEM}>
							<Attribute label={t("patron_request.pickup_location_name")}>
								{pickupLocationDataLoading ? (
									<CircularProgress
										color="inherit"
										size={13}
										sx={{ ml: 1 }}
										aria-label={t("ui.info.loading.value")}
									/>
								) : pickupLocationDataError ? (
									t("patron_request.error_pickup")
								) : pickupLocation?.id &&
								  auth?.user?.profile?.roles?.includes("LIBRARY_ADMIN") ? (
									<Tooltip title={t("location.view_location")}>
										<CustomLink
											to="/locations/$id"
											params={{ id: pickupLocation.id }}>
											{pickupLocation.name}
										</CustomLink>
									</Tooltip>
								) : (
									<RenderAttribute attribute={pickupLocation?.name} />
								)}
							</Attribute>
						</Grid>
						<Grid size={DETAIL_ITEM}>
							<Attribute label={t("patron_request.request_created")}>
								<RenderAttribute
									attribute={formatTimestamp(patronRequest?.dateCreated, clock)}
								/>
							</Attribute>
						</Grid>
						<Grid size={DETAIL_ITEM}>
							<Attribute label={t("patron_request.request_updated")}>
								<RenderAttribute
									attribute={formatTimestamp(patronRequest?.dateUpdated, clock)}
								/>
							</Attribute>
						</Grid>
						<Grid size={DETAIL_ITEM}>
							<Attribute label={t("patron_request.next_poll")}>
								<RenderAttribute
									attribute={formatTimestamp(patronRequest?.nextScheduledPoll, clock)}
								/>
							</Attribute>
							<Button
								variant="outlined"
								color="primary"
								sx={{ marginTop: 1 }}
								onClick={() => updateMutation.mutate()}
								aria-describedby={untracked ? "check-for-updates-reason" : undefined}
								disabled={updateMutation.isPending || untracked}>
								{t("patron_request.check_for_updates")}
								{updateMutation.isPending ? (
									<CircularProgress
										color="inherit"
										size={13}
										sx={{ ml: 1 }}
										aria-label={t("ui.info.loading.value")}
									/>
								) : null}
							</Button>
							{untracked ? (
								<Typography variant="body2" id="check-for-updates-reason">
									{t("patron_request.check_for_updates_disabled", {
										status: dcbStatusLabel(patronRequest?.status, t),
									})}
								</Typography>
							) : null}
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
								open={updateErrorAlertVisibility || cleanupFailure !== null}
								severityType="error"
								alertText={
									updateErrorAlertVisibility
										? t("patron_request.check_unsuccessful")
										: cleanupFailure
											? t("patron_request.cleanup_unsuccessful_detail", { detail: cleanupFailure })
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
										: () => setCleanupFailure(null)
								}
							/>
						</Grid>
						<Grid size={DETAIL_ITEM}>
							<Attribute label={t("patron_request.previous_status")}>
								<RenderAttribute attribute={dcbStatusLabel(patronRequest?.previousStatus, t)} />
							</Attribute>
						</Grid>
						<Grid size={DETAIL_ITEM}>
							<Attribute label={t("patron_request.status")}>
								<RenderAttribute attribute={dcbStatusLabel(patronRequest?.status, t)} />
							</Attribute>
							{auth?.user?.profile?.roles?.includes("LIBRARY_ADMIN") ? (
								<>
									<Button
										variant="outlined"
										color="primary"
										sx={{ marginTop: 1 }}
										onClick={() => setConfirmCleanup(true)}
										aria-describedby="cleanup-reason"
										disabled={cleanupMutation.isPending || !canCleanup}>
										{t("patron_request.cleanup")}
										{cleanupMutation.isPending ? (
											<CircularProgress
												color="inherit"
												size={13}
												sx={{ ml: 1 }}
												aria-label={t("ui.info.loading.value")}
											/>
										) : null}
									</Button>
									<Typography variant="body2" id="cleanup-reason">
										{canCleanup
											? t("patron_request.cleanup_info")
											: t(
													guardedCleanup
														? "patron_request.cleanup_disabled_guarded"
														: "patron_request.cleanup_disabled",
												)}
									</Typography>
									<Confirmation
										open={confirmCleanup}
										onClose={() => setConfirmCleanup(false)}
										onConfirm={() => {
											setConfirmCleanup(false);
											cleanupMutation.mutate(false);
										}}
										action="cleanup"
										entityName=""
										gridEdit={false}
									/>
									<CleanupOverrideDialog
										open={overrideDetail !== null}
										count={1}
										detail={overrideDetail ?? undefined}
										onClose={() => setOverrideDetail(null)}
										onConfirm={() => {
											setOverrideDetail(null);
											cleanupMutation.mutate(true);
										}}
									/>
									{offerConfirmReturn ? (
										<>
											<Button
												variant="outlined"
												color="primary"
												sx={{ marginTop: 1 }}
												onClick={() => setConfirmReturnOpen(true)}
												aria-describedby="confirm-returned-reason"
												disabled={confirmReturnMutation.isPending || !canConfirmReturn}>
												{t("patron_request.confirm_returned.button")}
												{confirmReturnMutation.isPending ? (
													<CircularProgress
														color="inherit"
														size={13}
														sx={{ ml: 1 }}
														aria-label={t("ui.info.loading.value")}
													/>
												) : null}
											</Button>
											<Typography variant="body2" id="confirm-returned-reason">
												{canConfirmReturn
													? t("patron_request.confirm_returned.info")
													: t("patron_request.confirm_returned.disabled")}
											</Typography>
											<Confirmation
												open={confirmReturnOpen}
												onClose={() => setConfirmReturnOpen(false)}
												onConfirm={() => {
													setConfirmReturnOpen(false);
													confirmReturnMutation.mutate();
												}}
												action="confirmReturned"
												entityName=""
												gridEdit={false}
											/>
										</>
									) : null}
								</>
							) : null}
							<TimedAlert
								open={confirmReturnSuccess}
								severityType="success"
								alertText={t("patron_request.confirm_returned.successful")}
								key="confirm-returned-success-alert"
								onCloseFunc={() => setConfirmReturnSuccess(false)}
							/>
							<TimedAlert
								open={confirmReturnError !== null}
								severityType="error"
								alertText={confirmReturnError ?? ""}
								key="confirm-returned-error-alert"
								onCloseFunc={() => setConfirmReturnError(null)}
							/>
							<TimedAlert
								open={cleanupRefusal !== null}
								severityType="warning"
								alertText={t("patron_request.cleanup_refused", {
									detail: cleanupRefusal ?? "",
								})}
								key="cleanup-refused-alert"
								onCloseFunc={() => setCleanupRefusal(null)}
							/>
						</Grid>
						<Grid size={DETAIL_ITEM}>
							<Attribute label={t("patron_request.next_expected_status")}>
								<RenderAttribute
									attribute={dcbStatusLabel(patronRequest?.nextExpectedStatus?.toString(), t)}
								/>
							</Attribute>
						</Grid>
						<Grid size={DETAIL_ITEM}>
							<Attribute label={t("patron_request.status_changed")}>
								<RenderAttribute
									attribute={formatTimestamp(patronRequest?.currentStatusTimestamp, clock, {
										precise: true,
									})}
								/>
							</Attribute>
						</Grid>
						<Grid size={DETAIL_ITEM}>
							<Attribute label={t("patron_request.time_in_status")}>
								<RenderAttribute
									attribute={formatDuration(
										patronRequest?.elapsedTimeInCurrentStatus,
									)}
								/>
							</Attribute>
						</Grid>
						<Grid size={DETAIL_ITEM}>
							<Attribute label={t("patron_request.polling_checks_in_status")}>
								<RenderAttribute
									attribute={patronRequest?.pollCountForCurrentStatus?.toString()}
								/>
							</Attribute>
						</Grid>
						<Grid size={DETAIL_ITEM}>
							<Attribute label={t("patron_request.active_workflow")}>
								<RenderAttribute attribute={patronRequest?.activeWorkflow} />
							</Attribute>
						</Grid>
						<Grid size={DETAIL_ITEM}>
							<Attribute label={t("patron_request.out_of_sequence")}>
								<RenderAttribute
									attribute={patronRequest?.outOfSequenceFlag?.toString()}
								/>
							</Attribute>
						</Grid>
						<Grid size={DETAIL_ITEM}>
							<Attribute label={t("patron_request.resolution_count")}>
								<RenderAttribute
									attribute={patronRequest?.resolutionCount?.toString()}
								/>
							</Attribute>
						</Grid>
						<Grid size={DETAIL_ITEM}>
							<Attribute label={t("patron_request.renewal_status")}>
								<RenderAttribute attribute={patronRequest?.renewalStatus} />
							</Attribute>
						</Grid>
						<Grid size={DETAIL_ITEM}>
							<Attribute label={t("patron_request.renewal_count")}>
								<RenderAttribute
									attribute={patronRequest?.renewalCount?.toString()}
								/>
							</Attribute>
						</Grid>
						<Grid size={DETAIL_ITEM}>
							<Attribute label={t("patron_request.error_message")}>
								<RenderAttribute attribute={patronRequest?.errorMessage} />
							</Attribute>
						</Grid>
						<Grid size={DETAIL_ITEM}>
							<Attribute label={t("patron_request.requestor_note")}>
								<RenderAttribute attribute={patronRequest?.requesterNote} />
							</Attribute>
						</Grid>
						<Grid size={DETAIL_ITEM}>
							<Attribute label={t("patron_request.description")}>
								<RenderAttribute attribute={patronRequest?.description} />
							</Attribute>
						</Grid>
						<Grid size={DETAIL_ITEM}>
							<Attribute label={t("patron_request.request_uuid")}>
								<RenderAttribute attribute={patronRequest?.id} />
							</Attribute>
						</Grid>
						<Grid size={DETAIL_ITEM}>
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
						columns={DETAIL_COLUMNS}>
						<Grid size={FULL_ROW}>
							<Typography variant="accordionSummary">
								{t("requesting.bib_record")}
							</Typography>
						</Grid>
						<Grid size={DETAIL_ITEM}>
							<Attribute label={t("bibs.record_title")}>
								<RenderAttribute
									attribute={patronRequest?.clusterRecord?.title}
								/>
							</Attribute>
						</Grid>
						<Grid size={DETAIL_ITEM}>
							<Attribute label={t("bibs.record_created")}>
								<RenderAttribute
									attribute={formatTimestamp(patronRequest?.clusterRecord?.dateCreated, clock)}
								/>
							</Attribute>
						</Grid>
						<Grid size={DETAIL_ITEM}>
							<Attribute label={t("bibs.record_updated")}>
								<RenderAttribute
									attribute={formatTimestamp(patronRequest?.clusterRecord?.dateUpdated, clock)}
								/>
							</Attribute>
						</Grid>
						<Grid size={DETAIL_ITEM}>
							<Attribute label={t("bibs.cluster_uuid")}>
								{linkToCluster ? (
									<Tooltip
										title={t("bibs.view_cluster_record", {
											id: patronRequest?.bibClusterId,
											title: patronRequest?.clusterRecord?.title,
										})}>
										<CustomLink
											to="/requesting/$recordId"
											params={{ recordId: patronRequest.bibClusterId }}
											title={t("common.discovery")}>
											<RenderAttribute
												attribute={patronRequest?.bibClusterId}
											/>
										</CustomLink>
									</Tooltip>
								) : (
									<RenderAttribute attribute={patronRequest?.bibClusterId} />
								)}
							</Attribute>
						</Grid>
						<Grid size={DETAIL_ITEM}>
							<Attribute label={t("bibs.selected_bib_uuid")}>
								<RenderAttribute
									attribute={patronRequest?.clusterRecord?.selectedBib}
								/>
							</Attribute>
						</Grid>
						<Grid size={DETAIL_ITEM}>
							<Attribute label={t("bibs.source_record_id")}>
								<RenderAttribute
									attribute={
										members?.[0]?.sourceRecordId
									}
								/>
							</Attribute>
						</Grid>
						<Grid size={DETAIL_ITEM}>
							<Attribute label={t("bibs.source_system_id")}>
								<RenderAttribute
									attribute={
										members?.[0]?.sourceSystemId
									}
								/>
							</Attribute>
						</Grid>
					</Grid>
					<Accordion variant="sub" disableGutters>
						<AccordionSummary
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
											<Box component="pre" key={index} sx={WRAPPED_PRE}>
												{JSON.stringify(member.sourceRecord, null, 2)}
											</Box>
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
						columns={DETAIL_COLUMNS}>
						<Grid size={FULL_ROW}>
							<Typography variant="accordionSummary">
								{t("patron_request.supplying")}
							</Typography>
						</Grid>
						<Grid size={DETAIL_ITEM}>
							<Attribute label={t("patron_request.supplying_agency_code")}>
								<RenderAttribute
									attribute={supplier?.localAgency}
								/>
							</Attribute>
						</Grid>
						<Grid size={DETAIL_ITEM}>
							<Attribute label={t("hostlms.code")}>
								<RenderAttribute
									attribute={supplier?.hostLmsCode}
								/>
							</Attribute>
						</Grid>
						<Grid size={DETAIL_ITEM}>
							<Attribute label={t("patron_request.active")}>
								<RenderAttribute
									attribute={String(supplier?.isActive)}
								/>
							</Attribute>
						</Grid>
						<Grid size={DETAIL_ITEM}>
							<Attribute label={t("patron_request.date_created")}>
								<RenderAttribute
									attribute={formatTimestamp(supplier?.dateCreated, clock)}
								/>
							</Attribute>
						</Grid>
						<Grid size={DETAIL_ITEM}>
							<Attribute label={t("patron_request.date_updated")}>
								<RenderAttribute
									attribute={formatTimestamp(supplier?.dateUpdated, clock)}
								/>
							</Attribute>
						</Grid>
						<Grid size={DETAIL_ITEM}>
							<Attribute label={t("patron_request.local_request_status")}>
								<RenderAttribute
									attribute={supplier?.localStatus}
								/>
							</Attribute>
						</Grid>
						<Grid size={DETAIL_ITEM}>
							<Attribute label={t("patron_request.local_request_status_raw")}>
								<RenderAttribute
									attribute={supplier?.rawLocalStatus}
								/>
							</Attribute>
						</Grid>
						<Grid size={DETAIL_ITEM}>
							<Attribute label={t("patron_request.supplier_uuid")}>
								<RenderAttribute attribute={supplier?.id} />
							</Attribute>
						</Grid>
						<Grid size={DETAIL_ITEM}>
							<Attribute label={t("patron_request.local_bib_id")}>
								<RenderAttribute
									attribute={supplier?.localBibId}
								/>
							</Attribute>
						</Grid>
						<Grid size={DETAIL_ITEM}>
							<Attribute label={t("patron_request.local_supplier_id")}>
								<RenderAttribute
									attribute={supplier?.localId}
								/>
							</Attribute>
						</Grid>
					</Grid>

					<Grid
						container
						spacing={{ xs: 2, md: 3 }}
						columns={DETAIL_COLUMNS}>
						<Grid
                            size={FULL_ROW}
                            sx={{
                                mb: 1,
                                mt: 1
                            }}>
							<Divider aria-hidden="true"></Divider>
						</Grid>
						<Grid size={FULL_ROW}>
							<Typography variant="h3" sx={{ fontWeight: "bold" }}>
								{t("patron_request.item")}
							</Typography>
						</Grid>
						<Grid size={DETAIL_ITEM}>
							<Attribute label={t("patron_request.local_item_barcode")}>
								<RenderAttribute
									attribute={supplier?.localItemBarcode}
								/>
							</Attribute>
						</Grid>
						<Grid size={DETAIL_ITEM}>
							<Attribute label={t("patron_request.local_item_loc")}>
								<RenderAttribute
									attribute={supplier?.localItemLocationCode}
								/>
							</Attribute>
						</Grid>
						<Grid size={DETAIL_ITEM}>
							<Attribute label={t("patron_request.local_item_status")}>
								<RenderAttribute
									attribute={supplier?.localItemStatus}
								/>
							</Attribute>
						</Grid>
						<Grid size={DETAIL_ITEM}>
							<Attribute label={t("patron_request.local_item_status_raw")}>
								<RenderAttribute
									attribute={supplier?.rawLocalItemStatus}
								/>
							</Attribute>
						</Grid>
						<Grid size={DETAIL_ITEM}>
							<Attribute label={t("patron_request.renewal_count_supplier")}>
								<RenderAttribute
									attribute={supplier?.localRenewalCount?.toString()}
								/>
							</Attribute>
						</Grid>
						<Grid size={DETAIL_ITEM}>
							<Attribute label={t("patron_request.local_item_type")}>
								<RenderAttribute
									attribute={supplier?.localItemType}
								/>
							</Attribute>
						</Grid>
						<Grid size={DETAIL_ITEM}>
							<Attribute label={t("patron_request.supplier_ctype")}>
								<RenderAttribute
									attribute={supplier?.canonicalItemType}
								/>
							</Attribute>
						</Grid>
						<Grid size={DETAIL_ITEM}>
							<Attribute label={t("patron_request.local_item_id")}>
								<RenderAttribute
									attribute={supplier?.localItemId}
								/>
							</Attribute>
						</Grid>
						<Grid size={DETAIL_ITEM}>
							<Attribute label={t("patron_request.item_manually_selected")}>
								<RenderAttribute
									attribute={patronRequest?.isManuallySelectedItem?.toString()}
								/>
							</Attribute>
						</Grid>
						<Grid size={DETAIL_ITEM}>
							<Attribute label={t("patron_request.item_manual_agency_code")}>
								<RenderAttribute
									attribute={patronRequest?.localItemAgencyCode}
								/>
							</Attribute>
						</Grid>
						<Grid size={DETAIL_ITEM}>
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
						columns={DETAIL_COLUMNS}>
						<Grid
                            size={FULL_ROW}
                            sx={{
                                mb: 1,
                                mt: 1
                            }}>
							<Divider aria-hidden="true"></Divider>
						</Grid>
						<Grid size={FULL_ROW}>
							<Typography variant="h3" sx={{ fontWeight: "bold" }}>
								{t("patron_request.virtual_patron")}
							</Typography>
						</Grid>
						<Grid size={DETAIL_ITEM}>
							<Attribute label={t("patron_request.local_id")}>
								<RenderAttribute
									attribute={
										supplier?.virtualPatron?.localId
									}
								/>
							</Attribute>
						</Grid>
						<Grid size={DETAIL_ITEM}>
							<Attribute label={t("patron_request.local_barcode")}>
								<RenderAttribute
									attribute={
										supplier?.virtualPatron?.localBarcode
									}
								/>
							</Attribute>
						</Grid>
						<Grid size={DETAIL_ITEM}>
							<Attribute label={t("patron_request.borrowing_patron_type")}>
								<RenderAttribute
									attribute={
										supplier?.virtualPatron?.localPtype
									}
								/>
							</Attribute>
						</Grid>
						<Grid size={DETAIL_ITEM}>
							<Attribute label={t("patron_request.patron_type_dcb")}>
								<RenderAttribute
									attribute={
										supplier?.virtualPatron?.canonicalPtype
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
						columns={DETAIL_COLUMNS}>
						<Grid size={FULL_ROW}>
							<Typography variant="accordionSummary">
								{t("patron_request.borrowing", "Borrowing")}
							</Typography>
						</Grid>
						<Grid size={DETAIL_ITEM}>
							<Attribute label={t("hostlms.code")}>
								<RenderAttribute attribute={patronRequest?.patronHostlmsCode} />
							</Attribute>
						</Grid>
						<Grid size={DETAIL_ITEM}>
							<Attribute label={t("patron_request.borrowing_request_id")}>
								<RenderAttribute attribute={patronRequest?.localRequestId} />
							</Attribute>
						</Grid>
						<Grid size={DETAIL_ITEM}>
							<Attribute label={t("patron_request.borrowing_request_status")}>
								<RenderAttribute
									attribute={patronRequest?.localRequestStatus}
								/>
							</Attribute>
						</Grid>
						<Grid size={DETAIL_ITEM}>
							<Attribute label={t("patron_request.borrowing_request_status_raw")}>
								<RenderAttribute
									attribute={patronRequest?.rawLocalRequestStatus}
								/>
							</Attribute>
						</Grid>

						<Grid size={DETAIL_ITEM}>
							<Attribute label={t("patron_request.borrowing_patron_id")}>
								<RenderAttribute
									attribute={patronRequest?.requestingIdentity?.localId}
								/>
							</Attribute>
						</Grid>
						<Grid size={DETAIL_ITEM}>
							<Attribute label={t("patron_request.borrowing_patron_barcode")}>
								<RenderAttribute
									attribute={patronRequest?.requestingIdentity?.localBarcode}
								/>
							</Attribute>
						</Grid>
						<Grid size={DETAIL_ITEM}>
							<Attribute label={t("patron_request.borrowing_patron_type")}>
								<RenderAttribute
									attribute={patronRequest?.requestingIdentity?.localPtype}
								/>
							</Attribute>
						</Grid>
						<Grid size={DETAIL_ITEM}>
							<Attribute label={t("patron_request.patron_canonical_ptype")}>
								<RenderAttribute
									attribute={patronRequest?.requestingIdentity?.canonicalPtype}
								/>
							</Attribute>
						</Grid>
						<Grid size={DETAIL_ITEM}>
							<Attribute label={t("patron_request.patron_uuid")}>
								<RenderAttribute attribute={patronRequest?.patron?.id} />
							</Attribute>
						</Grid>
						<Grid size={DETAIL_ITEM}>
							<Attribute label={t("patron_request.requestor_uuid")}>
								<RenderAttribute
									attribute={patronRequest?.requestingIdentity?.id}
								/>
							</Attribute>
						</Grid>

						<Grid
                            size={FULL_ROW}
                            sx={{
                                mb: 1,
                                mt: 1
                            }}>
							<Divider aria-hidden="true"></Divider>
						</Grid>
						<Grid size={FULL_ROW}>
							<Typography variant="h3" sx={{ fontWeight: "bold" }}>
								{t("patron_request.virtual_item")}
							</Typography>
						</Grid>
						<Grid size={DETAIL_ITEM}>
							<Attribute label={t("patron_request.borrowing_virtual_id")}>
								<RenderAttribute attribute={patronRequest?.localItemId} />
							</Attribute>
						</Grid>
						<Grid size={DETAIL_ITEM}>
							<Attribute label={t("patron_request.borrowing_virtual_type")}>
								<RenderAttribute attribute={patronRequest?.localItemType} />
							</Attribute>
						</Grid>
						<Grid size={DETAIL_ITEM}>
							<Attribute label={t("patron_request.borrowing_virtual_item_status")}>
								<RenderAttribute attribute={patronRequest?.localItemStatus} />
							</Attribute>
						</Grid>
						<Grid size={DETAIL_ITEM}>
							<Attribute label={t("patron_request.borrowing_virtual_item_status_raw")}>
								<RenderAttribute
									attribute={patronRequest?.rawLocalItemStatus}
								/>
							</Attribute>
						</Grid>
						<Grid size={DETAIL_ITEM}>
							<Attribute label={t("patron_request.borrowing_virtual_bib_id")}>
								<RenderAttribute attribute={patronRequest?.localBibId} />
							</Attribute>
						</Grid>
						<Grid size={DETAIL_ITEM}>
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
						columns={DETAIL_COLUMNS}>
						<Grid size={FULL_ROW}>
							<Typography variant="accordionSummary">
								{t("patron_request.pickup")}
							</Typography>
						</Grid>
						<Grid size={DETAIL_ITEM}>
							<Attribute label={t("patron_request.pickup_location_name")}>
								{pickupLocationDataLoading ? (
									<CircularProgress
										color="inherit"
										size={13}
										sx={{ ml: 1 }}
										aria-label={t("ui.info.loading.value")}
									/>
								) : pickupLocationDataError ? (
									t("patron_request.error_pickup")
								) : pickupLocation?.id &&
								  auth?.user?.profile?.roles?.includes("LIBRARY_ADMIN") ? (
									<Tooltip title={t("location.view_location")}>
										<CustomLink
											to="/locations/$id"
											params={{ id: pickupLocation.id }}>
											{pickupLocation.name}
										</CustomLink>
									</Tooltip>
								) : (
									<RenderAttribute attribute={pickupLocation?.name} />
								)}
							</Attribute>
						</Grid>
						<Grid size={DETAIL_ITEM}>
							<Attribute label={t("patron_request.pickup_request_id")}>
								<RenderAttribute attribute={patronRequest?.pickupRequestId} />
							</Attribute>
						</Grid>
						<Grid size={DETAIL_ITEM}>
							<Attribute label={t("patron_request.pickup_request_status")}>
								<RenderAttribute
									attribute={patronRequest?.pickupRequestStatus}
								/>
							</Attribute>
						</Grid>
						<Grid size={DETAIL_ITEM}>
							<Attribute label={t("patron_request.pickup_request_status_raw")}>
								<RenderAttribute
									attribute={patronRequest?.rawPickupRequestStatus}
								/>
							</Attribute>
						</Grid>
						<Grid
                            size={FULL_ROW}
                            sx={{
                                mb: 1,
                                mt: 1
                            }}>
							<Divider aria-hidden="true"></Divider>
						</Grid>
						<Grid size={FULL_ROW}>
							<Typography variant="h3" sx={{ fontWeight: "bold" }}>
								{t("patron_request.virtual_patron")}
							</Typography>
						</Grid>

						<Grid size={DETAIL_ITEM}>
							<Attribute label={t("patron_request.pickup_patron_id")}>
								<RenderAttribute attribute={patronRequest?.pickupPatronId} />
							</Attribute>
						</Grid>
						<Grid size={DETAIL_ITEM}>
							<Attribute label={t("patron_request.local_barcode")}>
								{patronIdentitiesLoading ? (
									<CircularProgress
										color="inherit"
										size={13}
										sx={{ ml: 1 }}
										aria-label={t("ui.info.loading.value")}
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
						<Grid size={DETAIL_ITEM}>
							<Attribute label={t("patron_request.borrowing_patron_type")}>
								{patronIdentitiesLoading ? (
									<CircularProgress
										color="inherit"
										size={13}
										sx={{ ml: 1 }}
										aria-label={t("ui.info.loading.value")}
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
						<Grid size={DETAIL_ITEM}>
							<Attribute label={t("patron_request.patron_type_dcb")}>
								{patronIdentitiesLoading ? (
									<CircularProgress
										color="inherit"
										size={13}
										sx={{ ml: 1 }}
										aria-label={t("ui.info.loading.value")}
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
                            size={FULL_ROW}
                            sx={{
                                mb: 1,
                                mt: 1
                            }}>
							<Divider aria-hidden="true"></Divider>
						</Grid>
						<Grid size={FULL_ROW}>
							<Typography variant="h3" sx={{ fontWeight: "bold" }}>
								{t("patron_request.virtual_item")}
							</Typography>
						</Grid>

						<Grid size={DETAIL_ITEM}>
							<Attribute label={t("patron_request.pickup_item_id")}>
								<RenderAttribute attribute={patronRequest?.pickupItemId} />
							</Attribute>
						</Grid>
						<Grid size={DETAIL_ITEM}>
							<Attribute label={t("patron_request.pickup_item_type")}>
								<RenderAttribute attribute={patronRequest?.pickupItemType} />
							</Attribute>
						</Grid>
						<Grid size={DETAIL_ITEM}>
							<Attribute label={t("patron_request.pickup_item_status")}>
								<RenderAttribute attribute={patronRequest?.pickupItemStatus} />
							</Attribute>
						</Grid>
						<Grid size={DETAIL_ITEM}>
							<Attribute label={t("patron_request.pickup_item_status_raw")}>
								<RenderAttribute
									attribute={patronRequest?.rawPickupItemStatus}
								/>
							</Attribute>
						</Grid>
						<Grid size={DETAIL_ITEM}>
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
					<PatronRequestAuditLog
						apiBase={cfg.VITE_DCB_API_BASE}
						patronRequestId={patronRequest.id}
					/>
				</TabPanel>
			</TabContext>
		</>
	);
}
