import { Attribute } from "@components/Attribute/Attribute";
import { pageTitle } from "@helpers/pageTitle";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useBlocker, useRouter } from "@tanstack/react-router";
import {
	BrandUploadError,
	uploadStagedBrandImages,
} from "@helpers/brandAssetUpload";
import request from "graphql-request";
import { invalidateLibrary, libraryQueryOptions } from "@helpers/sharedQueries";
import { createRestClient } from "@helpers/createRestClient";
import { authHeaders } from "@helpers/auth";
import { queryKeys } from "@helpers/queryKeys";
import { useAuth } from "react-oidc-context";
import { useAgencyCodes } from "@/hooks/useAgencyCodes";
import { Library } from "@models/Library";
import { useTranslation } from "react-i18next";
import RenderAttribute from "../../components/RenderAttribute/RenderAttribute";
import {
	Alert,
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
	suppliedByLibraryQuery,
} from "@helpers/patronRequestScope";
import TopTitlesSummary from "@components/TopTitlesSummary/TopTitlesSummary";
import TopRequestorsSummary from "@components/TopRequestorSummary/TopRequestorSummary";

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

export const Route = createFileRoute("/__authenticated/library")({
	head: () => ({ meta: [{ title: pageTitle("nav.library.title") }] }),
	component: LibraryRoute,
});

// Remounted per library: choosing another in the header is not a navigation, and an
// edit begun on one library must not be saved onto the next
function LibraryRoute() {
	const { agencyCode } = useAgencyCodes();
	return <HomeComponent key={agencyCode ?? ""} />;
}

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

	const { agencyCode: code } = useAgencyCodes();

	const [editMode, setEditMode] = useState(false);
	const [showConfirmationEdit, setConfirmationEdit] = useState(false);
	const firstEditableFieldRef = useRef<HTMLInputElement>(null);
	const [changedFields, setChangedFields] = useState<Partial<Library>>({});
	const saveButtonRef = useRef<HTMLButtonElement>(null);
	const handleCancel = () => {
		setEditMode(false);
		setChangedFields({});
		setStagedLogo(null);
		reset();
	};

	const DCB_API_BASE = cfg?.VITE_DCB_API_BASE;
	const queryClient = useQueryClient();

	// Read once per render rather than at each call site, so the two cards below
	// cannot disagree with each other.
	const insightsEnabled = isInsightsEnabled();

	// No discovery front end means nowhere for a patron logo, a theme or a footer link to
	// appear, so the two blocks below are not offered. Unlike the capability flags they
	// compose with, this one is only a render switch: the fields stay in the document and
	// the mutation sends changed fields only, so a stored brand survives being hidden.
	const discoveryActive = isDiscoveryActive();

	// A deployment with dcb.branding.assets.store=none has no upload route, so the
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
	const handleEdit = () => {
		setEditMode(true);
		setTimeout(() => {
			if (firstEditableFieldRef.current) {
				firstEditableFieldRef.current.focus();
			}
		}, 0);
	};

	const { data, isError } = useQuery(
		libraryQueryOptions(DCB_API_BASE, code ?? ""),
	);

	const library: Library | undefined = data?.libraries?.content?.[0];
	const userLibraryHostLmsCode = library?.agency?.hostLms?.code;

	const {
		data: supplierRequestStats,
		isLoading: supplierRequestStatsLoading,
		isError: supplierRequestStatsError,
		isFetching: supplierRequestFetching,
	} = useQuery<PatronRequestQueryData>({
		queryKey: queryKeys.requestStats.supplied(DCB_API_BASE, code ?? ""),
		queryFn: async () => {
			const baseQuery = suppliedByLibraryQuery(code);
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
				await authHeaders(),
			);
		},
		// Gated on the agency code, which is what supplyingAgencyCode is built from -
		// this waited on a Host LMS lookup the query never used
		enabled: !!DCB_API_BASE && !!code,
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
		// Both the agency and the Host LMS feed the scope this query runs under.
		queryKey: queryKeys.requestStats.borrowed(
			DCB_API_BASE,
			code ?? "",
			userLibraryHostLmsCode,
		),
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
				await authHeaders(),
			);
		},
		// Gated on whatever the scope is actually built from - see the borrowing grid
		enabled:
			!!DCB_API_BASE && hasBorrowingScope(code, userLibraryHostLmsCode),
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
				await authHeaders(),
			);
			return response.updateLibrary;
		},
		onSuccess: () => {
			setChangedFields({});
			setEditMode(false);
			void invalidateLibrary(queryClient, DCB_API_BASE, code ?? "");
			setAlert({
				open: true,
				severity: "success",
				text: t("common.update_success", {
					entity: t("entities.library"),
					name: library?.fullName,
				}),
				title: t("common.updated"),
			});
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
	 * The logo chosen but not yet uploaded.
	 *
	 * Uploading at pick time left a stored image behind every time somebody reconsidered or
	 * closed the tab; dcb-service cannot tell those from an image about to be used, so it
	 * keeps unreferenced uploads for a day and sweeps them. Staging makes that the rare case.
	 * The cost is that a rejected image is reported at Save.
	 */
	const [stagedLogo, setStagedLogo] = useState<File | null>(null);

	const stageLogo = (file: File | null) => setStagedLogo(file);

	// Here rather than inside the field, because the upload is part of Save.
	const uploadClient = useMemo(
		() => createRestClient(DCB_API_BASE),
		[DCB_API_BASE],
	);

	const {
		control,
		handleSubmit,
		reset,
		setValue,
		formState: { errors, isDirty },
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

	const hasUnsavedEdits = editMode && (isDirty || !!stagedLogo);
	const leaveGuard = useBlocker({
		shouldBlockFn: () => hasUnsavedEdits,
		enableBeforeUnload: hasUnsavedEdits,
		disabled: !hasUnsavedEdits,
		withResolver: true,
	});

	useEffect(() => {
		// Not while editing: a refetch (a focus, a renewed token in the key) would
		// otherwise replace what the administrator has typed with the server's copy.
		if (library && !editMode) {
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
	}, [library, editMode, reset]);

	// refactor this into common code
	const onSubmit = async (data: Partial<Library>) => {
		// Nothing to compare against while the record is being refetched.
		if (!library) return;

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
		updateLibraryMutation.mutate({
			id: library?.id,
			...changedFields,
			reason,
			changeCategory,
			changeReferenceUrl,
		});
		setConfirmationEdit(false);
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
            {isError && (
				<Grid size={{ xs: 4, sm: 8, md: 12 }}>
					<Alert severity="error">{t("library.load_failed")}</Alert>
				</Grid>
			)}
            {/* Not "Welcome to DCB Admin for , …" while the library loads, or if it fails */}
            {library?.fullName ? (
				<Grid size={{ xs: 4, sm: 8, md: 12 }}>
					<Typography>
						{t("library.greeting", {
							library: library.fullName,
							name: auth.user?.profile?.name,
						})}
					</Typography>
				</Grid>
			) : null}
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
									disabled={
										!library ||
										Object.keys(errors).length > 0 ||
										!(isDirty || stagedLogo)
									}
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
					{t("library.information_short")}
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
              {/* Patron-facing brand. Its own labelled block because everything
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
            {/* Presence. A patron who arrives at discovery from a search
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
            {/* Behind its own flag, not the branding one: support_url arrives
                after the 9.0.0 tag, and the brand columns arrived in it. The
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
						<CircularProgress
							size="1rem"
							aria-label={t("library.statistics.loading")}
						/>
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
						<CircularProgress
							size="1rem"
							aria-label={t("library.statistics.loading")}
						/>
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
								libraryCode={userLibraryHostLmsCode ?? ""}
							/>
						</Stack>
					</Grid>
					<Grid size={{ xs: 4, sm: 8, md: 12 }}>
						<Stack spacing={1} direction={"column"}>
							<Typography variant="h3" component="h2" sx={{ fontWeight: "bold" }}>
								{t("library.statistics.top_requesters_month")}
							</Typography>
							<TopRequestorsSummary
								libraryCode={userLibraryHostLmsCode ?? ""}
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
            {leaveGuard.status === "blocked" && (
				<Confirmation
					open
					onClose={leaveGuard.reset}
					onConfirm={() => leaveGuard.proceed()}
					action="unsavedChanges"
					entityName={library?.fullName ?? ""}
					entityType={t("entities.library")}
					gridEdit={false}
				/>
			)}
        </Grid>
    );
}
