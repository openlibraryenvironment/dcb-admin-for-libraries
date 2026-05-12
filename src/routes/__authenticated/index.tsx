import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import request from "graphql-request";
import { getLibrary } from "../../queries/getLibrary";
import { useAuth } from "react-oidc-context";
import { Library } from "@models/Library";
import { useTranslation } from "react-i18next";
import RenderAttribute from "../../components/RenderAttribute/RenderAttribute";
import {
	Button,
	CircularProgress,
	Stack,
	TextField,
	useTheme,
} from "@mui/material";
import AddressLink from "../../components/Address/AddressLink";
import { Controller, useForm } from "react-hook-form";
import { UpdateLibraryFormData } from "../../models/UpdateLibraryFormData";
import { updateLibrary } from "../../mutations/updateLibrary";
import { UpdateLibraryResponse } from "../../models/UpdateLibraryResponse";
import { useEffect, useMemo, useRef, useState } from "react";
import * as Yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import TimedAlert from "../../components/TimedAlert/TimedAlert";
import { formatChangedFields } from "../../helpers/confirmationFunctions";
import { AlertObject } from "../../models/AlertObject";
import Confirmation from "../../components/Confirmation/Confirmation";
import Cancel from "@mui/icons-material/Cancel";
import Edit from "@mui/icons-material/Edit";
import Save from "@mui/icons-material/Save";
import { isEmpty } from "lodash";
import { isFunctionalSettingEnabled } from "@helpers/findFunctionalSetting";
import { FunctionalSettingStatus } from "@models/FunctionalSetting";
import { PatronRequestQueryData } from "@models/ReactQueryHelperTypes";
import { getPatronRequestStats } from "@queries/getPatronRequestStats";
import TopTitlesSummary from "@components/TopTitlesSummary/TopTitlesSummary";
import TopRequestorsSummary from "@components/TopRequestorSummary/TopRequestorSummary";

// Landing page, also library information page
export const Route = createFileRoute("/__authenticated/")({
	component: HomeComponent,
});

function HomeComponent() {
	const auth = useAuth();
	const { t } = useTranslation();
	// console.log(auth);

	const { cfg } = useRouter().options.context as { cfg: any };

	const headers = useMemo(
		() => ({
			Authorization: `Bearer ${auth.user?.access_token}`,
		}),
		[auth.user?.access_token],
	);

	const code = auth.user?.profile?.code;
	console.log(auth);

	const theme = useTheme();
	const [editMode, setEditMode] = useState(false);
	const [showConfirmationEdit, setConfirmationEdit] = useState(false);
	const firstEditableFieldRef = useRef<HTMLInputElement>(null);
	const [changedFields, setChangedFields] = useState<Partial<Library>>({});
	const saveButtonRef = useRef<HTMLButtonElement>(null);
	// const FEEDBACK_LINK = "https://forms.gle/pc5yVDufGRdrGz6Y7";
	const handleCancel = () => {
		setEditMode(false);
		setChangedFields({});
		reset();
	};

	const DCB_API_BASE = cfg?.VITE_DCB_API_BASE;

	const [alert, setAlert] = useState<AlertObject>({
		open: false,
		severity: "success",
		text: "",
		title: "",
	});

	// Refactor into common functionality
	// Handling the edits, saves, info
	// then the confirm save
	// and then also the unsaved changes warning - this will probably be very different in tanstack router
	const handleEdit = () => {
		setEditMode(true);
		setTimeout(() => {
			if (firstEditableFieldRef.current) {
				firstEditableFieldRef.current.focus();
			}
		}, 0);
	};

	// skip if headers not available
	// figure out polling intervals
	// need a better way of handling tokens as this causes a request to be sent (almost) every time
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const { data, isError, isLoading, refetch } = useQuery({
		queryKey: ["libraryInfo", headers, code, DCB_API_BASE],
		queryFn: async () =>
			request(
				DCB_API_BASE + "/graphql",
				getLibrary,
				{
					query: "agencyCode:" + code,
					pagesize: 10,
					pageno: 0,
					orderBy: "fullName",
					order: "DESC",
				},
				headers,
			),
		// do the on success here
	});
	// on success

	//@ts-expect-error TYPING
	const library: Library = data?.libraries?.content?.[0];
	const userLibraryHostLmsCode = library?.agency?.hostLms?.code;

	const {
		data: supplierRequestStats,
		isLoading: supplierRequestStatsLoading,
		isError: supplierRequestStatsError,
		isFetching: supplierRequestFetching,
	} = useQuery<PatronRequestQueryData>({
		queryKey: ["LoadSupplierRequestStats", DCB_API_BASE, headers, code],
		queryFn: async () => {
			const baseQuery = `supplyingAgencyCode:${code}`;
			const queryVariables = {
				query: baseQuery ?? "",
				pagesize: 20,
				pageno: 0,
				order: "dateCreated",
				orderBy: "DESC",
			};
			return request(
				`${DCB_API_BASE}/graphql`,
				getPatronRequestStats,
				queryVariables,
				headers,
			);
		},
		enabled: !!headers && !!DCB_API_BASE && !!userLibraryHostLmsCode,
		// refetchInterval: 1000000, // milliseconds
		refetchOnWindowFocus: true,
		refetchIntervalInBackground: false,
		placeholderData: (previousData) => previousData,
	});

	const {
		data: patronRequestStats,
		isLoading: patronRequestStatsLoading,
		error: patronRequestStatsError,
		isFetching: patronRequestStatsFetching,
	} = useQuery<PatronRequestQueryData>({
		queryKey: [
			"LoadPatronRequestStats",
			DCB_API_BASE,
			headers,
			userLibraryHostLmsCode,
		],
		queryFn: async () => {
			const baseQuery = `patronHostlmsCode:${userLibraryHostLmsCode}`;
			const queryVariables = {
				query: baseQuery ?? "",
				pagesize: 20,
				pageno: 0,
				order: "dateCreated",
				orderBy: "DESC",
			};
			return request(
				`${DCB_API_BASE}/graphql`,
				getPatronRequestStats,
				queryVariables,
				headers,
			);
		},
		enabled: !!headers && !!DCB_API_BASE && !!userLibraryHostLmsCode,
		// refetchInterval: 1000000, // milliseconds
		refetchOnWindowFocus: true,
		refetchIntervalInBackground: false,
		placeholderData: (previousData) => previousData,
	});

	// Sort out types for graphql queries - we don't have apollo to do this for us any more

	const editingEnabled =
		isFunctionalSettingEnabled(library, "DENY_LIBRARY_MAPPING_EDIT") ==
		FunctionalSettingStatus.DISABLED;

	const updateLibraryMutation = useMutation({
		mutationFn: async (formData: UpdateLibraryFormData) => {
			const response: UpdateLibraryResponse = await request(
				cfg.VITE_DCB_API_BASE + "/graphql",
				updateLibrary,
				{
					input: {
						id: library?.id,
						...formData,
					},
				},
				headers,
			);
			return response.updateLibrary;
		},
		onSuccess: (data) => {
			setChangedFields({});
			setEditMode(false);
			refetch();
			// console.log(data);
			setAlert({
				open: true,
				severity: "success",
				text: t("common.update_success", {
					entity: t("entities.library"),
					name: library?.fullName,
				}),
				title: t("common.updated"),
			});
			if (data) {
				reset({
					fullName: library.fullName ?? "",
					shortName: library.shortName ?? "",
					abbreviatedName: library.abbreviatedName ?? "",
					supportHours: library.supportHours ?? "",
					backupDowntimeSchedule: library.backupDowntimeSchedule,
					longitude: library.longitude,
					latitude: library.latitude,
				});
			}
			refetch();
		},
		onError: () => {
			setAlert({
				open: true,
				severity: "error",
				text: t("common.update_error", {
					entity: t("entities.library"),
					name: library?.fullName,
				}),
				title: t("common.error"),
			});
		},
	});

	const validationSchema = Yup.object().shape({
		fullName: Yup.string()
			.trim()
			.nonNullable(t("ui.validation.required"))
			.required(
				t("ui.validation.required", { field: t("ui.library.full_name") }),
			)
			.max(255, t("ui.validation.max_length", { length: 255 })),
		shortName: Yup.string()
			.trim()
			.max(32, t("ui.validation.max_length", { length: 32 })),
		abbreviatedName: Yup.string()
			.trim()
			.nonNullable(t("ui.validation.required"))
			.max(32, t("ui.validation.max_length", { length: 128 })),
		latitude: Yup.number()
			.transform((value, originalValue) =>
				originalValue === "" ? null : value,
			)
			.typeError(t("ui.validation.locations.lat"))
			.min(-90, t("ui.validation.locations.lat"))
			.max(90, t("ui.validation.locations.lat")),
		longitude: Yup.number()
			.transform((value, originalValue) =>
				originalValue === "" ? null : value,
			)
			.typeError(t("ui.validation.locations.long"))
			.min(-180, t("ui.validation.locations.long"))
			.max(180, t("ui.validation.locations.long")),
		backupDowntimeSchedule: Yup.string()
			.trim()
			.max(200, t("ui.validation.max_length", { length: 200 })),
		supportHours: Yup.string()
			.trim()
			.max(200, t("ui.validation.max_length", { length: 200 })),
	});

	const {
		control,
		handleSubmit,
		reset,
		formState: { errors, isDirty },
		// watch,
	} = useForm<UpdateLibraryFormData>({
		defaultValues: {
			fullName: library?.fullName,
			shortName: library?.shortName,
			latitude: library?.latitude,
			longitude: library?.longitude,
			backupDowntimeSchedule: library?.backupDowntimeSchedule,
			supportHours: library?.supportHours,
		},
		//@ts-expect-error Until we figure this type mismatch out
		resolver: yupResolver(validationSchema),
		mode: "onChange",
	});

	useEffect(() => {
		if (library) {
			// The reset function populates the form with the latest data
			// from the query, whether it's the initial fetch or a subsequent poll.
			// This exists to replicate what was previously handled by the onSuccess in react-query
			// https://tkdodo.eu/blog/breaking-react-querys-api-on-purpose
			reset({
				fullName: library.fullName ?? "",
				shortName: library.shortName ?? "",
				abbreviatedName: library.abbreviatedName ?? "",
				supportHours: library.supportHours ?? "",
				backupDowntimeSchedule: library.backupDowntimeSchedule ?? "",
				latitude: library.latitude,
				longitude: library.longitude,
			});
		}
	}, [library, reset]);

	// refactor this into common code
	const onSubmit = (data: Partial<Library>) => {
		const newChangedFields = Object.keys(data).reduce((acc, key) => {
			const field = key as keyof UpdateLibraryFormData;
			const currentValue = data[field];
			const originalValue = library[field];

			if (currentValue !== originalValue && currentValue !== undefined) {
				(acc[field] as typeof currentValue) = currentValue;
			}
			return acc;
		}, {} as Partial<UpdateLibraryFormData>);
		setChangedFields(newChangedFields);
		if (Object.keys(newChangedFields).length === 0) {
			setEditMode(false);
			return;
		}
		setConfirmationEdit(true);
	};

	const handleConfirmSave = async (
		reason: string,
		changeCategory: string,
		changeReferenceUrl: string,
	) => {
		try {
			updateLibraryMutation.mutate({
				id: library.id,
				...changedFields,
				reason,
				changeCategory,
				changeReferenceUrl,
			});
		} catch (error) {
			console.error("Error updating library:", error);
			setAlert({
				open: true,
				severity: "error",
				text: t("ui.data_grid.edit_error", {
					entity: t("entities.location"),
					name: library?.fullName,
				}),
				title: t("ui.data_grid.updated"),
			});
		} finally {
			setConfirmationEdit(false);
		}
	};

	return (
		<Grid
			container
			spacing={{ xs: 2, md: 3 }}
			columns={{ xs: 4, sm: 8, md: 12 }}>
			<Grid size={{ xs: 4, sm: 8, md: 12 }}>
				<Typography>
					{t("welcome.title", {
						library: library?.fullName,
						name: auth.user?.profile?.name,
					})}
				</Typography>
			</Grid>
			{/* <Grid size={{ xs: 4, sm: 8, md: 12 }}>
				<Typography>
					<Trans
						i18nKey="welcome.background"
						values={{
							library: library?.fullName,
							name: auth.user?.profile?.name,
						}}
						components={{
							linkComponent: <Link href={FEEDBACK_LINK} />,
						}}
					/>
				</Typography>
			</Grid> */}
			{editingEnabled ? (
				<Grid size={{ xs: 4, sm: 8, md: 12 }}>
					<>
						{editMode ? (
							<>
								<Button
									variant="contained"
									color="primary"
									startIcon={<Save />}
									onClick={handleSubmit(onSubmit)}
									disabled={!isEmpty(errors) || !isDirty}
									ref={saveButtonRef}
									sx={{ mr: 1 }}>
									{t("ui.actions.save")}
								</Button>
								<Button
									variant="outlined"
									startIcon={<Cancel />}
									onClick={handleCancel}>
									{t("ui.actions.cancel")}
								</Button>
							</>
						) : auth?.user?.profile?.roles?.includes("LIBRARY_ADMIN") ? (
							<Button
								variant="contained"
								color="primary"
								startIcon={<Edit />}
								onClick={handleEdit}>
								{t("ui.actions.edit")}
							</Button>
						) : null}
					</>
				</Grid>
			) : null}
			<Grid size={{ xs: 4, sm: 8, md: 12 }}>
				<Typography variant="h3" fontWeight={"bold"}>
					{/* {t("welcome.library", { library: library?.fullName })} */}
					{t("welcome.library_short")}
				</Typography>
			</Grid>
			<Grid size={{ xs: 2, sm: 4, md: 4 }}>
				<Stack direction="column">
					<Typography
						variant="attributeTitle"
						color={
							errors.fullName
								? theme.palette.error.main
								: theme.palette.common.black
						}>
						{t("library.full_name")}
					</Typography>
				</Stack>
				<Controller
					name="fullName"
					control={control}
					render={({ field }) =>
						editMode ? (
							<TextField
								{...field}
								label={t("library.full_name")}
								fullWidth
								error={!!errors.fullName}
								helperText={errors.fullName?.message}
								disabled={!editMode}
								inputRef={firstEditableFieldRef}
								margin="normal"
							/>
						) : (
							<RenderAttribute attribute={library?.fullName} />
						)
					}
				/>
			</Grid>
			<Grid size={{ xs: 2, sm: 4, md: 4 }}>
				<Stack direction="column">
					<Typography
						variant="attributeTitle"
						color={
							errors.shortName
								? theme.palette.error.main
								: theme.palette.common.black
						}>
						{t("library.short_name")}
					</Typography>
					<Controller
						name="shortName"
						control={control}
						render={({ field }) =>
							editMode ? (
								<TextField
									{...field}
									label={t("library.short_name")}
									fullWidth
									error={!!errors.shortName}
									helperText={errors.shortName?.message}
									disabled={!editMode}
									margin="normal"
								/>
							) : (
								<RenderAttribute attribute={library?.shortName} />
							)
						}
					/>
				</Stack>
			</Grid>
			<Grid size={{ xs: 2, sm: 4, md: 4 }}>
				<Stack direction="column">
					<Typography
						variant="attributeTitle"
						color={
							errors.abbreviatedName
								? theme.palette.error.main
								: theme.palette.common.black
						}>
						{t("library.abbreviated_name")}
					</Typography>
					<Controller
						name="abbreviatedName"
						control={control}
						render={({ field }) =>
							editMode ? (
								<TextField
									{...field}
									label={t("library.abbreviated_name")}
									fullWidth
									error={!!errors.abbreviatedName}
									helperText={errors.abbreviatedName?.message}
									disabled={!editMode}
									margin="normal"
								/>
							) : (
								<RenderAttribute attribute={library?.abbreviatedName} />
							)
						}
					/>
				</Stack>
			</Grid>
			<Grid size={{ xs: 2, sm: 4, md: 4 }}>
				<Stack direction={"column"}>
					<Typography variant="attributeTitle">{t("library.type")}</Typography>
					<RenderAttribute attribute={library?.type} />
				</Stack>
			</Grid>
			<Grid size={{ xs: 2, sm: 4, md: 4 }}>
				<Stack direction={"column"}>
					<Typography variant="attributeTitle">{t("agency.code")}</Typography>
					<RenderAttribute attribute={library?.agencyCode} />
				</Stack>
			</Grid>
			<Grid size={{ xs: 2, sm: 4, md: 4 }}>
				<Stack direction="column">
					<Typography
						variant="attributeTitle"
						color={
							errors.supportHours
								? theme.palette.error.main
								: theme.palette.common.black
						}>
						{t("library.support_hours")}
					</Typography>
					<Controller
						name="supportHours"
						control={control}
						render={({ field }) =>
							editMode ? (
								<TextField
									{...field}
									label={t("library.support_hours")}
									fullWidth
									error={!!errors.supportHours}
									helperText={errors.supportHours?.message}
									disabled={!editMode}
									margin="normal"
								/>
							) : (
								<RenderAttribute attribute={library?.supportHours} />
							)
						}
					/>
				</Stack>
			</Grid>
			<Grid size={{ xs: 2, sm: 4, md: 4 }}>
				<Stack direction="column">
					<Typography
						variant="attributeTitle"
						color={
							errors.backupDowntimeSchedule
								? theme.palette.error.main
								: theme.palette.common.black
						}>
						{t("library.backup_schedule")}
					</Typography>
					<Controller
						name="backupDowntimeSchedule"
						control={control}
						render={({ field }) =>
							editMode ? (
								<TextField
									{...field}
									label={t("library.backup_schedule")}
									fullWidth
									error={!!errors.backupDowntimeSchedule}
									helperText={errors.backupDowntimeSchedule?.message}
									disabled={!editMode}
									margin="normal"
								/>
							) : (
								<RenderAttribute attribute={library?.backupDowntimeSchedule} />
							)
						}
					/>
				</Stack>
			</Grid>
			<Grid size={{ xs: 2, sm: 4, md: 4 }}>
				<Stack direction={"column"}>
					<Typography variant="attributeTitle">
						{t("library.site_designation")}
					</Typography>
					{/* This may need special handling when we have real data and know what format it's coming in */}
					<RenderAttribute
						attribute={
							library?.agency?.hostLms?.clientConfig?.contextHierarchy[0]
						}
					/>
				</Stack>
			</Grid>
			<Grid size={{ xs: 2, sm: 4, md: 4 }}>
				<Stack direction={"column"}>
					<Typography variant="attributeTitle">{t("library.id")}</Typography>
					<RenderAttribute attribute={library?.id} />
				</Stack>
			</Grid>
			{/* /* 'Primary location' title goes here/* */}
			{/* <Grid size={{ xs: 4, sm: 8, md: 12 }}>
				<Typography variant="h3" fontWeight={"bold"}>
					{t("library.primary_location.title")}
				</Typography>
			</Grid> */}
			<Grid size={{ xs: 2, sm: 4, md: 4 }}>
				<Stack direction={"column"}>
					<Typography variant="attributeTitle">
						{t("library.primary_location.address")}
					</Typography>
					{/* This will need address-specific handling, and possibly its own component - leave as placeholder until we're ready + open maps in new tab*/}
					<AddressLink address={library?.address} />
				</Stack>
			</Grid>
			<Grid size={{ xs: 2, sm: 4, md: 4 }}>
				<Stack direction="column">
					<Typography
						variant="attributeTitle"
						color={
							errors.latitude
								? theme.palette.error.main
								: theme.palette.common.black
						}>
						{t("common.latitude")}
					</Typography>
					<Controller
						name="latitude"
						control={control}
						render={({ field }) =>
							editMode ? (
								<TextField
									{...field}
									label={t("common.latitude")}
									fullWidth
									error={!!errors.latitude}
									helperText={errors.latitude?.message}
									disabled={!editMode}
									margin="normal"
								/>
							) : (
								<RenderAttribute attribute={library?.latitude} type="number" />
							)
						}
					/>
				</Stack>
			</Grid>
			<Grid size={{ xs: 2, sm: 4, md: 4 }}>
				<Stack direction="column">
					<Typography
						variant="attributeTitle"
						color={
							errors.longitude
								? theme.palette.error.main
								: theme.palette.common.black
						}>
						{t("common.longitude")}
					</Typography>
					<Controller
						name="longitude"
						control={control}
						render={({ field }) =>
							editMode ? (
								<TextField
									{...field}
									label={t("common.longitude")}
									fullWidth
									error={!!errors.longitude}
									helperText={errors.longitude?.message}
									disabled={!editMode}
									margin="normal"
								/>
							) : (
								<RenderAttribute attribute={library?.longitude} type="number" />
							)
						}
					/>
				</Stack>
			</Grid>
			<Grid size={{ xs: 4, sm: 8, md: 12 }}>
				<Typography variant="h3" fontWeight={"bold"}>
					{t("library.statistics.title")}
				</Typography>
			</Grid>
			<Grid size={{ xs: 2, sm: 4, md: 4 }}>
				<Stack direction={"column"}>
					<Typography variant="attributeTitle">
						{t("library.statistics.requests_made")}
					</Typography>
					{patronRequestStatsLoading || patronRequestStatsFetching ? (
						<CircularProgress size="1rem" />
					) : (
						<RenderAttribute
							attribute={
								patronRequestStatsError
									? t("ui.feedback.error.fetching")
									: patronRequestStats?.patronRequests?.totalSize
							}
						/>
					)}
				</Stack>
			</Grid>
			<Grid size={{ xs: 2, sm: 4, md: 4 }}>
				<Stack direction={"column"}>
					<Typography variant="attributeTitle">
						{t("library.statistics.requests_supplied")}
					</Typography>
					{supplierRequestStatsLoading || supplierRequestFetching ? (
						<CircularProgress size="1rem" />
					) : (
						<RenderAttribute
							attribute={
								supplierRequestStatsError
									? t("ui.feedback.error.fetching")
									: supplierRequestStats?.patronRequests?.totalSize
							}
						/>
					)}
				</Stack>
			</Grid>
			<Grid size={{ xs: 4, sm: 8, md: 12 }}>
				<Stack spacing={1} direction={"column"}>
					<Typography variant="h3" fontWeight={"bold"}>
						{t("library.statistics.top_titles_month")}
					</Typography>
					<TopTitlesSummary
						headers={headers}
						libraryCode={userLibraryHostLmsCode}
					/>
				</Stack>
			</Grid>
			<Grid size={{ xs: 4, sm: 8, md: 12 }}>
				<Stack spacing={1} direction={"column"}>
					<Typography variant="h3" fontWeight={"bold"}>
						{t("library.statistics.top_requesters_month")}
					</Typography>
					<TopRequestorsSummary
						headers={headers}
						libraryCode={userLibraryHostLmsCode}
					/>
				</Stack>
			</Grid>
			<TimedAlert
				open={alert.open}
				severityType={alert.severity}
				autoHideDuration={6000}
				alertText={alert.text}
				onCloseFunc={() => setAlert({ ...alert, open: false })}
				alertTitle={alert.title}
			/>
			{library && showConfirmationEdit && (
				<Confirmation
					open={showConfirmationEdit}
					onClose={() => setConfirmationEdit(false)}
					onConfirm={handleConfirmSave}
					action="pageEdit"
					editInformation={formatChangedFields(changedFields, library)}
					entityName={library?.fullName}
					entityType={t("entities.library")}
					gridEdit={false}
				/>
			)}
		</Grid>
	);
}
