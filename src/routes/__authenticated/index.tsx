import { Attribute } from "@components/Attribute/Attribute";
import { pageTitle } from "@helpers/pageTitle";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import axios from "axios";
import {
	BrandUploadError,
	uploadStagedBrandImages,
} from "@helpers/brandAssetUpload";
import request from "graphql-request";
import { getLibrary } from "../../queries/getLibrary";
import { useAuth } from "react-oidc-context";
import { useAgencyCodes } from "@/hooks/useAgencyCodes";
import { Library } from "@models/Library";
import { useTranslation } from "react-i18next";
import RenderAttribute from "../../components/RenderAttribute/RenderAttribute";
import {
	Button,
	CircularProgress,
	MenuItem,
	Stack,
	TextField,
} from "@mui/material";
import { BrandImageField } from "@components/BrandImageField/BrandImageField";
import { useBrandUploadsAvailable } from "@/hooks/useBrandUploadsAvailable";
import { themeOptions } from "@constants/discoveryBranding";
import AddressLink from "../../components/Address/AddressLink";
import { Controller, useForm } from "react-hook-form";
import { UpdateLibraryFormData } from "../../models/UpdateLibraryFormData";
import { updateLibrary } from "../../mutations/updateLibrary";
import { stripUnsupportedInput } from "@helpers/capabilityFields";
import {
	isDiscoveryActive,
	isInsightsEnabled,
	isLibraryBrandingEnabled,
	isLibrarySupportUrlEnabled,
} from "@helpers/featureFlags";
import { UpdateLibraryResponse } from "../../models/UpdateLibraryResponse";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { libraryProfileSchema } from "@/schemas/libraryProfile";
import { yupResolver } from "@hookform/resolvers/yup";
import TimedAlert from "../../components/TimedAlert/TimedAlert";
import { formatChangedFields } from "../../helpers/confirmationFunctions";
import { AlertObject } from "../../models/AlertObject";
import Confirmation from "../../components/Confirmation/Confirmation";
import Cancel from "@mui/icons-material/Cancel";
import Edit from "@mui/icons-material/Edit";
import Save from "@mui/icons-material/Save";
import { isFunctionalSettingEnabled } from "@helpers/findFunctionalSetting";
import { FunctionalSettingStatus } from "@models/FunctionalSetting";
import { PatronRequestQueryData } from "@models/ReactQueryHelperTypes";
import { getPatronRequestStats } from "@queries/getPatronRequestStats";
import {
	borrowedByLibraryQuery,
	hasBorrowingScope,
} from "@helpers/patronRequestScope";
import TopTitlesSummary from "@components/TopTitlesSummary/TopTitlesSummary";
import TopRequestorsSummary from "@components/TopRequestorSummary/TopRequestorSummary";

// Landing page, also library information page
/**
 * A profile field, which is named twice over in the two modes and must not be
 * named twice at once: in read mode the heading is the value's only label and
 * is associated with it, and in edit mode the control carries its own, so the
 * heading goes away rather than sitting seven pixels above a floating label
 * saying the same thing (WCAG 2.5.3, and e2e/library-profile.spec.ts).
 *
 * Local to this route rather than a flag on Attribute: only this page has two
 * modes, and the difference belongs at the edge that owns it.
 */
const ProfileField = ({
	editMode,
	label,
	children,
}: {
	editMode: boolean;
	label: ReactNode;
	children: ReactNode;
}) =>
	editMode ? <>{children}</> : <Attribute label={label}>{children}</Attribute>;

export const Route = createFileRoute("/__authenticated/")({
	head: () => ({ meta: [{ title: pageTitle("nav.home.title") }] }),
	component: HomeComponent,
});

/**
 * Whether an edit actually changed a field.
 *
 * An empty control and an unset column are the same state, and treating them as different
 * put every untouched optional field into the confirmation dialog as a pending change.
 * That was survivable while the form held seven mostly-populated fields; the brand fields
 * are mostly empty, so it is not any more.
 */
function hasChanged(next: unknown, current: unknown): boolean {
	const normalise = (value: unknown) =>
		value === null || value === undefined ? "" : value;
	return normalise(next) !== normalise(current);
}

function HomeComponent() {
	const auth = useAuth();
	const { t } = useTranslation();

	const { cfg } = useRouter().options.context as { cfg: any };

	const headers = useMemo(
		() => ({
			Authorization: `Bearer ${auth.user?.access_token}`,
		}),
		[auth.user?.access_token],
	);

	const { agencyCode: code } = useAgencyCodes();

	const [editMode, setEditMode] = useState(false);
	const [showConfirmationEdit, setConfirmationEdit] = useState(false);
	const firstEditableFieldRef = useRef<HTMLInputElement>(null);
	const [changedFields, setChangedFields] = useState<Partial<Library>>({});
	const saveButtonRef = useRef<HTMLButtonElement>(null);
	const handleCancel = () => {
		setEditMode(false);
		setChangedFields({});
		reset();
	};

	const DCB_API_BASE = cfg?.VITE_DCB_API_BASE;

	// Read once per render rather than at each call site, so the two cards below
	// cannot disagree with each other.
	const insightsEnabled = isInsightsEnabled();

	// No discovery front end means nowhere for a patron logo, a theme or a footer link to
	// appear, so the two blocks below are not offered. Unlike the capability flags they
	// compose with, this one is only a render switch: the fields stay in the document and
	// the mutation sends changed fields only, so a stored brand survives being hidden.
	const discoveryActive = isDiscoveryActive();

	// R-17b. A deployment with dcb.branding.assets.store=none has no upload route, so the
	// button would 404. The URL field stays either way — pointing at a CDN the library
	// already runs is a first-class route in, not a fallback.
	const brandUploadsAvailable = useBrandUploadsAvailable();

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
				getLibrary(),
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
		// Gated on the agency code, which is what supplyingAgencyCode is built from -
		// this waited on a Host LMS lookup the query never used
		enabled: !!headers && !!DCB_API_BASE && !!code,
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
			// Both feed the scope this query runs under, so a change to either has to
			// invalidate what was cached against the previous one
			code,
		],
		queryFn: async () => {
			const baseQuery = borrowedByLibraryQuery(code, userLibraryHostLmsCode);
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
		// Gated on whatever the scope is actually built from - see the borrowing grid
		enabled:
			!!headers &&
			!!DCB_API_BASE &&
			hasBorrowingScope(code, userLibraryHostLmsCode),
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
				updateLibrary(),
				{
					// Stripped, not blanked. UpdateLibraryInput does not declare the brand
					// keys before dcb-service 9.0.0, and an undeclared input field fails
					// the whole mutation - so on an older deployment nothing on this form
					// would save, brand or not.
					input: stripUnsupportedInput({
						id: library?.id,
						...formData,
					}),
				},
				headers,
			);
			return response.updateLibrary;
		},
		onSuccess: (data) => {
			setChangedFields({});
			setEditMode(false);
			refetch();
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
					brandLogoUrl: library.brandLogoUrl ?? "",
					brandLogoAlt: library.brandLogoAlt ?? "",
					defaultThemeName: library.defaultThemeName ?? "",
					patronWebsite: library.patronWebsite ?? "",
					supportUrl: library.supportUrl ?? "",
				});
			}
			refetch();
		},
		onError: () => {
			setAlert({
				open: true,
				severity: "error",
				text: t("common.update_failure", {
					entity: t("entities.library"),
					name: library?.fullName,
				}),
				title: t("common.error"),
			});
		},
	});

	const validationSchema = useMemo(() => libraryProfileSchema(t), [t]);

	/**
	 * The logo chosen but not yet uploaded — R-17e.
	 *
	 * Uploading at pick time left a stored image behind every time somebody reconsidered or
	 * closed the tab; dcb-service cannot tell those from an image about to be used, so it
	 * keeps unreferenced uploads for a day and sweeps them. Staging makes that the rare case.
	 * The cost is that a rejected image is reported at Save.
	 */
	const [stagedLogo, setStagedLogo] = useState<File | null>(null);

	const stageLogo = (file: File | null) => setStagedLogo(file);

	/**
	 * The upload moved here from inside the field, because the upload is now part of Save.
	 * This app has no shared REST client, so the base URL and bearer token are assembled the
	 * same way the component used to assemble them.
	 */
	const uploadClient = useMemo(
		() => ({
			post: (path: string, body: FormData) =>
				axios.post(`${DCB_API_BASE}${path}`, body, {
					headers: { Authorization: `Bearer ${auth.user?.access_token}` },
				}),
		}),
		[DCB_API_BASE, auth.user?.access_token],
	);

	const {
		control,
		handleSubmit,
		reset,
		setValue,
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
				brandLogoUrl: library.brandLogoUrl ?? "",
				brandLogoAlt: library.brandLogoAlt ?? "",
				defaultThemeName: library.defaultThemeName ?? "",
				patronWebsite: library.patronWebsite ?? "",
				supportUrl: library.supportUrl ?? "",
			});
		}
	}, [library, reset]);

	// refactor this into common code
	const onSubmit = async (data: Partial<Library>) => {
		// The staged logo is uploaded HERE, before the confirmation dialog rather than after
		// it: asking somebody to confirm a save we already know will be rejected is asking
		// them to approve something that will not happen.
		let submitted = data;

		if (stagedLogo) {
			try {
				const uploaded = await uploadStagedBrandImages(
					{ brandLogoUrl: stagedLogo },
					uploadClient,
					t("library.brand.upload_failed"),
				);

				// Into the form as well as the diff, so the URL box shows what was stored
				// rather than staying empty until the page is reloaded.
				setValue("brandLogoUrl", uploaded.brandLogoUrl, { shouldDirty: true });

				submitted = { ...data, ...uploaded };
				setStagedLogo(null);
			} catch (failure: unknown) {
				// dcb-service writes its refusals for a person — "the file is not a PNG or
				// a JPEG", "the image is 6000x4000; the limit is 4096 pixels on either
				// edge". Shown as-is: the whole argument for validating on the server is
				// undone if the administrator is told only that it failed.
				setAlert({
					open: true,
					severity: "error",
					text:
						failure instanceof BrandUploadError
							? failure.message
							: t("library.brand.upload_failed"),
					title: t("library.brand.logo_url"),
				});
				return;
			}
		}

		const newChangedFields = Object.keys(submitted).reduce((acc, key) => {
			const field = key as keyof UpdateLibraryFormData;
			const currentValue = submitted[field];
			const originalValue = library[field];

			if (hasChanged(currentValue, originalValue) && currentValue !== undefined) {
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
		} catch {
			setAlert({
				open: true,
				severity: "error",
				text: t("common.update_failure", {
					entity: t("entities.location"),
					name: library?.fullName,
				}),
				// The failure path, so the alert title is Error - matching the
				// identical handler above. It read ui.data_grid.updated, a key that
				// does not exist, so the alert was titled with the key itself.
				title: t("common.error"),
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
				<Typography variant="h1">
					{t("library.title", { library: library?.fullName })}
				</Typography>
			</Grid>
            <Grid size={{ xs: 4, sm: 8, md: 12 }}>
				<Typography>
					{t("welcome.title", {
						library: library?.fullName,
						name: auth.user?.profile?.name,
					})}
				</Typography>
			</Grid>
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
									disabled={Object.keys(errors).length > 0 || !isDirty}
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
				<Typography variant="h3" component="h2" sx={{
                    fontWeight: "bold"
                }}>
					{/* {t("welcome.library", { library: library?.fullName })} */}
					{t("welcome.library_short")}
				</Typography>
			</Grid>
            <Grid size={{ xs: 2, sm: 4, md: 4 }}>
				<ProfileField editMode={editMode} label={t("library.full_name")}>
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
				</ProfileField>
			</Grid>
            <Grid size={{ xs: 2, sm: 4, md: 4 }}>
				<ProfileField editMode={editMode} label={t("library.short_name")}>
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
				</ProfileField>
			</Grid>
            <Grid size={{ xs: 2, sm: 4, md: 4 }}>
				<ProfileField editMode={editMode} label={t("library.abbreviated_name")}>
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
				</ProfileField>
			</Grid>
            <Grid size={{ xs: 2, sm: 4, md: 4 }}>
				<Attribute label={t("library.type")}>
					<RenderAttribute attribute={library?.type} />
				</Attribute>
			</Grid>
            <Grid size={{ xs: 2, sm: 4, md: 4 }}>
				<Attribute label={t("agency.code")}>
					<RenderAttribute attribute={library?.agencyCode} />
				</Attribute>
			</Grid>
            <Grid size={{ xs: 2, sm: 4, md: 4 }}>
				<ProfileField editMode={editMode} label={t("library.support_hours")}>
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
				</ProfileField>
			</Grid>
            <Grid size={{ xs: 2, sm: 4, md: 4 }}>
				<ProfileField editMode={editMode} label={t("library.backup_schedule")}>
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
				</ProfileField>
			</Grid>
            <Grid size={{ xs: 2, sm: 4, md: 4 }}>
				<Attribute label={t("library.site_designation")}>
					{/* This may need special handling when we have real data and know what format it's coming in */}
					<RenderAttribute
						attribute={
							library?.agency?.hostLms?.clientConfig?.contextHierarchy[0]
						}
					/>
				</Attribute>
			</Grid>
            <Grid size={{ xs: 2, sm: 4, md: 4 }}>
				<Attribute label={t("library.id")}>
					<RenderAttribute attribute={library?.id} />
				</Attribute>
			</Grid>
            {/* Two gates, and they answer different questions. `discoveryActive` asks
                whether anything renders a patron logo at all. The branding flag asks
                whether this environment's dcb-service can store one: before 9.0.0 Library
                has no brand columns, so the flag also removes the fields from the document
                and the variables, which is what keeps the page working rather than merely
                tidy. See @constants/serviceCapabilities. */}
            {discoveryActive && isLibraryBrandingEnabled() && (
              <>
              {/* Patron-facing brand — N-1B. Its own labelled block because everything
  			    above configures this library's participation in DCB and these three
  			    configure what a patron sees in the discovery app. The library's mark
  			    leads the lockup there and the consortium's follows it, smaller: the
  			    patron is using their library, and the consortium is the supply network
  			    behind it. */}
              <Grid size={{ xs: 4, sm: 8, md: 12 }}>
  				<Typography variant="h3" component="h2" sx={{
                      fontWeight: "bold"
                  }}>
  					{t("library.brand.section")}
  				</Typography>
  				<Typography>{t("library.brand.section_help")}</Typography>
  				{/* Said once, in the section, rather than in each field's help text. A
  				    library choosing between uploading and pasting an address deserves to
  				    know what the second one costs. */}
  				<Typography
                      variant="body2"
                      sx={{
                          color: "text.secondary",
                          mt: 1
                      }}>
  					{t("library.brand.external_url_cost")}
  				</Typography>
  			</Grid>
              <Grid size={{ xs: 2, sm: 4, md: 4 }}>
  				<Attribute label={t("library.brand.logo_url")}>
  					<Controller
  						name="brandLogoUrl"
  						control={control}
  						render={({ field }) =>
  							editMode ? (
  								<BrandImageField
  									value={field.value ?? ""}
  									onChange={field.onChange}
  									stagedFile={stagedLogo}
  									onStageFile={stageLogo}
  									label={t("library.brand.logo_url")}
  									uploadsAvailable={brandUploadsAvailable}
  									error={!!errors.brandLogoUrl}
  									helperText={
  										errors.brandLogoUrl?.message ??
  										t("library.brand.logo_url_help")
  									}
  								/>
  							) : (
  								<RenderAttribute attribute={library?.brandLogoUrl} />
  							)
  						}
  					/>
  				</Attribute>
  			</Grid>
              <Grid size={{ xs: 2, sm: 4, md: 4 }}>
  				<ProfileField editMode={editMode} label={t("library.brand.logo_alt")}>
  					<Controller
  						name="brandLogoAlt"
  						control={control}
  						render={({ field }) =>
  							editMode ? (
  								<TextField
  									{...field}
  									label={t("library.brand.logo_alt")}
  									fullWidth
  									error={!!errors.brandLogoAlt}
  									helperText={
  										errors.brandLogoAlt?.message ??
  										t("library.brand.logo_alt_help")
  									}
  									margin="normal"
  								/>
  							) : (
  								<RenderAttribute attribute={library?.brandLogoAlt} />
  							)
  						}
  					/>
  				</ProfileField>
  			</Grid>
              <Grid size={{ xs: 2, sm: 4, md: 4 }}>
  				<ProfileField editMode={editMode} label={t("library.brand.theme")}>
  					<Controller
  						name="defaultThemeName"
  						control={control}
  						render={({ field }) =>
  							editMode ? (
  								// A list, not a colour. Every theme in the registry has been
  								// contrast-tested in light, dark and high contrast; a colour
  								// typed here would not be, and nothing on this page could tell
  								// the administrator it had failed.
  								(<TextField
  									{...field}
  									select
  									label={t("library.brand.theme")}
  									fullWidth
  									error={!!errors.defaultThemeName}
  									helperText={
  										errors.defaultThemeName?.message ??
  										t("library.brand.theme_help")
  									}
  									margin="normal">
                                      <MenuItem value="">
  										{t("library.brand.theme_inherit")}
  									</MenuItem>
                                      {themeOptions(library?.defaultThemeName).map((name) => (
  										<MenuItem key={name} value={name}>
  											{name}
  										</MenuItem>
  									))}
                                  </TextField>)
  							) : (
  								<RenderAttribute attribute={library?.defaultThemeName} />
  							)
  						}
  					/>
  				</ProfileField>
  			</Grid>
              </>
            )}
            {/* Presence — V-11.1. A patron who arrives at discovery from a search
                engine has no route back to opening hours, branches or joining, and no
                way to say the search itself is broken. Discovery holds neither fact;
                this library does, and its footer renders both.

                Two fields rather than one because they are two questions and rarely the
                same desk: collapsing them sends "your search is broken" to whoever
                answers "when do you open".

                Both are discovery's footer and nothing else's, so the whole block goes
                with it — heading included. `patronWebsite` needs no capability flag
                (Library has carried it since 5.11.1) and is gated here only. */}
            {discoveryActive && (
            <>
            <Grid size={{ xs: 4, sm: 8, md: 12 }}>
              <Typography variant="h3" component="h2" sx={{ fontWeight: "bold" }}>
                {t("library.presence.section")}
              </Typography>
              <Typography>{t("library.presence.section_help")}</Typography>
            </Grid>
            <Grid size={{ xs: 2, sm: 4, md: 4 }}>
              <ProfileField editMode={editMode} label={t("library.presence.website")}>
                <Controller
                  name="patronWebsite"
                  control={control}
                  render={({ field }) =>
                    editMode ? (
                      <TextField
                        {...field}
                        label={t("library.presence.website")}
                        fullWidth
                        error={!!errors.patronWebsite}
                        helperText={
                          errors.patronWebsite?.message ??
                          t("library.presence.website_help")
                        }
                        margin="normal"
                      />
                    ) : (
                      <RenderAttribute attribute={library?.patronWebsite} />
                    )
                  }
                />
              </ProfileField>
            </Grid>
            {/* Behind its own flag, not the branding one: support_url arrived in
                V9_0_008, after the 9.0.0 tag, and the brand columns arrived in it. The
                flag is not a render switch — it also keeps the field out of the document
                and out of the mutation variables, without which nothing on this form
                saves against a deployment that cannot accept it. */}
            {isLibrarySupportUrlEnabled() && (
              <Grid size={{ xs: 2, sm: 4, md: 4 }}>
                <ProfileField editMode={editMode} label={t("library.presence.support")}>
                  <Controller
                    name="supportUrl"
                    control={control}
                    render={({ field }) =>
                      editMode ? (
                        <TextField
                          {...field}
                          label={t("library.presence.support")}
                          fullWidth
                          error={!!errors.supportUrl}
                          helperText={
                            errors.supportUrl?.message ??
                            t("library.presence.support_help")
                          }
                          margin="normal"
                        />
                      ) : (
                        <RenderAttribute attribute={library?.supportUrl} />
                      )
                    }
                  />
                </ProfileField>
              </Grid>
            )}
            </>
            )}
            {/* /* 'Primary location' title goes here/* */}
            {/* <Grid size={{ xs: 4, sm: 8, md: 12 }}>
				<Typography variant="h3" component="h2" fontWeight={"bold"}>
					{t("library.primary_location.title")}
				</Typography>
			</Grid> */}
            <Grid size={{ xs: 2, sm: 4, md: 4 }}>
				<Attribute label={t("library.primary_location.address")}>
					{/* This will need address-specific handling, and possibly its own component - leave as placeholder until we're ready + open maps in new tab*/}
					<AddressLink address={library?.address} />
				</Attribute>
			</Grid>
            <Grid size={{ xs: 2, sm: 4, md: 4 }}>
				<ProfileField editMode={editMode} label={t("common.latitude")}>
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
				</ProfileField>
			</Grid>
            <Grid size={{ xs: 2, sm: 4, md: 4 }}>
				<ProfileField editMode={editMode} label={t("common.longitude")}>
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
				</ProfileField>
			</Grid>
            <Grid size={{ xs: 4, sm: 8, md: 12 }}>
				<Typography variant="h3" component="h2" sx={{
                    fontWeight: "bold"
                }}>
					{t("library.statistics.title")}
				</Typography>
			</Grid>
            <Grid size={{ xs: 2, sm: 4, md: 4 }}>
				<Attribute label={t("library.statistics.requests_made")}>
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
				</Attribute>
			</Grid>
            <Grid size={{ xs: 2, sm: 4, md: 4 }}>
				<Attribute label={t("library.statistics.requests_supplied")}>
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
				</Attribute>
			</Grid>
			{/*
			 * Both summary cards read the Insights API (/insights/top-requested-titles
			 * and /insights/top-requestors), so they belong behind the same flag as the
			 * dashboard. Ungated they defeated the flag's whole purpose: an environment
			 * that turns Insights OFF because its dcb-service is too old to serve those
			 * endpoints still fired both calls on its home page, and showed two broken
			 * cards to every library administrator on arrival.
			 *
			 * The heading is inside the guard with the card it labels - a heading over
			 * nothing is worse than an absent section, and it would leave a stray h3 in
			 * the page outline.
			 */}
			{insightsEnabled && (
				<>
					<Grid size={{ xs: 4, sm: 8, md: 12 }}>
						<Stack spacing={1} direction={"column"}>
							<Typography variant="h3" component="h2" sx={{ fontWeight: "bold" }}>
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
							<Typography variant="h3" component="h2" sx={{ fontWeight: "bold" }}>
								{t("library.statistics.top_requesters_month")}
							</Typography>
							<TopRequestorsSummary
								headers={headers}
								libraryCode={userLibraryHostLmsCode}
							/>
						</Stack>
					</Grid>
				</>
			)}
            <TimedAlert
				open={alert.open}
				severityType={alert.severity}
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
