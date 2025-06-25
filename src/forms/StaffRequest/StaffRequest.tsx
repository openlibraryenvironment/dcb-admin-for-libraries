import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as Yup from "yup";
import {
	Dialog,
	DialogContent,
	DialogTitle,
	IconButton,
	Link,
	Step,
	StepLabel,
	Stepper,
} from "@mui/material";
import { Trans, useTranslation } from "react-i18next";
import Close from "@mui/icons-material/Close";
import TimedAlert from "@components/TimedAlert/TimedAlert";
import { getLibraries } from "@queries/getLibraries";
import { getLocations } from "@queries/getLocations";
import axios, { AxiosError } from "axios";
import { useAuth } from "react-oidc-context";
import { getRequestError } from "@helpers/getRequestError";
import { Agency } from "@models/Agency";
import { LibraryGroupMember } from "@models/LibraryGroupMember";
import { findConsortium } from "@helpers/findConsortium";
import { Location } from "@models/Location";
import { Item } from "@models/Item";
import { PatronRequestFormType } from "@models/PatronRequestFormType";
import { PatronRequestAutocompleteOption } from "@models/PatronRequestAutocompleteOption";
import { PatronLookupResponse } from "@models/PatronLookupResponse";
import { PlaceRequestResponse } from "@models/PlaceRequestResponse";
import { StaffRequestFormData } from "@models/StaffRequestFormData";
import { useQuery, useMutation } from "@tanstack/react-query";
import request from "graphql-request";
import {
	LibrariesQueryData,
	LocationsQueryData,
} from "@models/ReactQueryHelperTypes";
import { StaffRequestDetailsStep } from "@forms/ExpeditedCheckout/steps/StaffRequestDetailsStep";
import { PatronValidationStep } from "@forms/ExpeditedCheckout/steps/PatronValidationStep";

// WHEN WE INTRODUCE DCB ADMIN FOR LIBRARIES THIS DROP DOWN FOR LIBRARIES MUST BE RESTRICTED TO ONLY THE LIBRARY THE USER IS MANAGING
// Pickup locations can be for anywhere, but the user's library should be prioritised
// put agency code on the user
// split into steps

export default function StaffRequest({
	show,
	onClose,
	bibClusterId,
}: PatronRequestFormType) {
	const { t } = useTranslation();
	const auth = useAuth();
	const headers = useMemo(
		() => ({
			Authorization: `Bearer ${auth.user?.access_token}`,
		}),
		[auth.user?.access_token]
	);
	const agencyCode = auth.user?.profile?.code
		? String(auth.user?.profile?.code)
		: ""; // This is the agency code - now on the user in the library context

	const [alert, setAlert] = useState<{
		open: boolean;
		severity: "success" | "error";
		text: string | null;
		patronRequestLink?: string;
	}>({
		open: false,
		severity: "success",
		text: null,
		patronRequestLink: "",
	});

	const [activeStep, setActiveStep] = useState(0);
	const [patronData, setPatronData] = useState<PatronLookupResponse | null>(
		null
	);

	const steps = [
		t("requesting.expedited_checkout.steps.patron_validation"),
		t("requesting.expedited_checkout.steps.request_creation"),
	];

	const validationSchema = Yup.object().shape({
		patronBarcode: Yup.string()
			.required(
				t("ui.validation.required", {
					field: t("requesting.staff_request.patron.barcode").toLowerCase(),
				})
			)
			.test(
				"no-square-brackets",
				t("requesting.staff_request.patron.error.no_brackets"),
				(value) => (value ? !value.includes("[") && !value.includes("]") : true)
			),
		agencyCode: Yup.string().required(
			t("ui.validation.required", {
				field: t("agency.code").toLowerCase(),
			})
		),
		pickupLocationId: Yup.string().required(
			t("ui.validation.required", {
				field: t(
					"requesting.staff_request.patron.pickup_location"
				).toLowerCase(),
			})
		),
		requesterNote: Yup.string(),
		selectionType: Yup.string().required(
			t("ui.validation.required", {
				field: t(
					"requesting.staff_request.patron.selection.type"
				).toLowerCase(),
			})
		),
		itemLocalId: Yup.string().when("selectionType", {
			is: "manual",
			then: (schema) =>
				schema.required(
					t("ui.validation.required", {
						field: t(
							"requesting.staff_request.patron.item_local_id"
						).toLowerCase(),
					})
				),
			otherwise: (schema) => schema.notRequired(),
		}),
		itemAgencyCode: Yup.string().when("selectionType", {
			is: "manual",
			then: (schema) =>
				schema.required(
					t("ui.validation.required", {
						field: t(
							"requesting.staff_request.patron.item_library"
						).toLowerCase(),
					})
				),
			otherwise: (schema) => schema.notRequired(),
		}),
	});

	const {
		control,
		handleSubmit,
		reset,
		watch,
		setValue,
		formState: { errors, isValid },
	} = useForm<StaffRequestFormData>({
		defaultValues: {
			patronBarcode: "",
			agencyCode: agencyCode,
			pickupLocationId: "",
			requesterNote: "Staff Request: ",
			selectionType: "automatic",
			itemLocalId: "",
			itemLocalSystemCode: "",
			itemAgencyCode: "", // For staff requesting, this can be anywhere.
		},
		resolver: yupResolver(validationSchema),
		mode: "onChange",
	});

	const selectionType = watch("selectionType");
	const patronAgencyCode = watch("agencyCode");
	const itemAgencyCode = watch("itemAgencyCode");
	const patronBarcode = watch("patronBarcode");

	// This query for all libraries runs automatically on component mount
	const {
		data: librariesData,
		isLoading: librariesDataLoading,
		// isError: librariesDataError,
	} = useQuery<LibrariesQueryData>({
		queryKey: ["librariesInfo", headers],
		queryFn: () =>
			request(
				`${import.meta.env.VITE_DCB_API_BASE}/graphql`,
				getLibraries,
				{
					order: "fullName",
					orderBy: "ASC",
					pageno: 0,
					pagesize: 1000,
					query: "",
				},
				headers
			),
	});

	const libraryOptions: PatronRequestAutocompleteOption[] =
		librariesData?.libraries?.content?.map(
			(item: {
				fullName: string;
				id: string;
				agencyCode: string;
				agency: Agency;
				membership: [LibraryGroupMember];
			}) => ({
				label: item.fullName,
				value: item.agencyCode,
				id: item.id,
				agencyId: item.agency?.id,
				functionalSettings: findConsortium(item?.membership)
					?.functionalSettings,
			})
		) || [];

	const selectedLibrary = libraryOptions.find(
		(option) => option.value === patronAgencyCode
	);
	const isPickupAnywhere = !!selectedLibrary?.functionalSettings?.some(
		(setting) => setting.name === "PICKUP_ANYWHERE" && setting.enabled === true
	); // This still matters in the context of staff requesting. However, pickup locations from the user's agency should be prioritised.

	// REFACTOR 1: Replaced `useLazyQuery` for pickup locations.
	// This query is disabled by default and will only be fetched when `refetch()` is called.
	const {
		data: pickupLocations,
		isLoading: pickupLocationsLoading,
		refetch: getPickupLocations,
	} = useQuery<LocationsQueryData>({
		queryKey: [
			"pickupLocations",
			selectedLibrary?.agencyId,
			isPickupAnywhere,
			headers,
		],
		queryFn: () => {
			const locationQuery = isPickupAnywhere
				? ""
				: `agency.id:${selectedLibrary?.agencyId}`;
			return request(
				`${import.meta.env.VITE_DCB_API_BASE}/graphql`,
				getLocations,
				{
					order: "name",
					orderBy: "ASC",
					pageno: 0,
					pagesize: 1000,
					query: locationQuery,
				},
				headers
			);
		},
		enabled: false, // <-- This makes the query "lazy"
	});

	// REFACTOR 2: Replaced manual axios call and useState for items with `useQuery`.
	// This is also a lazy query for fetching available items.
	const {
		data: availabilityResults,
		isLoading: itemsLoading,
		isError: itemsError,
		refetch: fetchItems,
	} = useQuery<any>({
		queryKey: ["itemAvailability", bibClusterId, headers],
		queryFn: () =>
			axios.get(`${import.meta.env.VITE_DCB_API_BASE}/items/availability`, {
				headers,
				params: { clusteredBibId: bibClusterId },
			}),
		enabled: false, // <-- This makes the query "lazy"
		select: (response) => response.data, // Select the data property from the axios response
	});

	const itemsData: Item[] = availabilityResults?.itemList || [];
	const filteredItems = itemsData.filter(
		(item) => item?.agency?.code === itemAgencyCode
	);

	const pickupLocationOptions: PatronRequestAutocompleteOption[] =
		pickupLocations?.locations?.content?.map(
			(item: { name: string; id: string; code: string }) => ({
				label: item.name,
				value: item.id,
				code: item.code,
			})
		) || [];
	const sortedPickupLocationOptions = useMemo(() => {
		if (!pickupLocations?.locations?.content) {
			return [];
		}
		const options = pickupLocations?.locations?.content.map(
			(item: {
				name: string;
				id: string;
				agency: { name: string; code: string };
			}) => ({
				label: item.name,
				value: item.id,
				agencyName:
					item?.agency?.name ??
					t("staff_request.patron.pickup_location_no_agency"),
				agencyCode: item?.agency?.code,
			})
		);

		// Sort the array of options
		return options.sort((a: any, b: any) => {
			const isAUserAgency = a.agencyCode === agencyCode;
			const isBUserAgency = b.agencyCode === agencyCode;

			// #1: The user's selected agency locations always come first.
			if (isAUserAgency && !isBUserAgency) return -1;
			if (!isAUserAgency && isBUserAgency) return 1;

			// #2: For all other locations (or within the user's agency group),
			// sort the groups alphabetically by agency name.
			if (a.agencyName && b.agencyName && a.agencyName !== b.agencyName) {
				return a.agencyName.localeCompare(b.agencyName);
			}

			// #3: Within each agency group, sort locations alphabetically by name.
			return a.label.localeCompare(b.label);
		});
	}, [pickupLocations?.locations?.content, t, agencyCode]);

	const itemLibraryOptions: PatronRequestAutocompleteOption[] =
		librariesData?.libraries?.content?.map(
			(item: { fullName: string; agencyCode: string; agency: Agency }) => ({
				label: item.fullName,
				value: item.agencyCode,
				hostLmsCode: item?.agency?.hostLms?.code,
			})
		) || [];

	const itemOptions: PatronRequestAutocompleteOption[] =
		filteredItems?.map(
			(item: {
				id: string;
				agency: Agency;
				location: Location;
				barcode: string;
			}) => ({
				label: t("requesting.staff_request.patron.item_select", {
					id: item.id,
					name: item.location.name,
					barcode: item.barcode,
				}),
				value: item.id,
			})
		) || [];

	// REFACTOR 3: Use `useMutation` for validating the patron.
	// This handles loading state, errors, and success callbacks cleanly.
	const validatePatronMutation = useMutation<
		PatronLookupResponse,
		unknown,
		{ patronBarcode: string; agencyCode: string }
	>({
		mutationFn: (variables) =>
			axios
				.post(
					`${import.meta.env.VITE_DCB_API_BASE}/patron/auth/lookup`,
					{
						patronPrinciple: variables.patronBarcode,
						agencyCode: variables.agencyCode,
					},
					{ headers }
				)
				.then((res) => res.data),
		onSuccess: (data) => {
			if (data.status === "VALID") {
				setPatronData(data);
				setActiveStep(1);
				setAlert({
					open: true,
					severity: "success",
					text: t("requesting.staff_request.patron.success.lookup", {
						barcode: patronBarcode,
						library: agencyCode,
					}),
				});
			} else {
				setAlert({
					open: true,
					severity: "error",
					text: t("requesting.staff_request.patron.error.validation_failure"),
				});
			}
		},
		onError: (error) => {
			console.error("Error validating patron:", error);
			setAlert({
				open: true,
				severity: "error",
				text: t("requesting.staff_request.patron.error.validation_failure"),
			});
		},
	});

	// REFACTOR 4: Use `useMutation` for submitting the final request.
	const placeRequestMutation = useMutation<
		PlaceRequestResponse,
		AxiosError,
		any
	>({
		mutationFn: (payload) =>
			axios
				.post(
					`${import.meta.env.VITE_DCB_API_BASE}/patrons/requests/place`,
					payload,
					{ headers }
				)
				.then((res) => res.data),
		onSuccess: (data) => {
			const patronRequestLink = `/patronRequests/${data.id}`;
			setAlert({
				open: true,
				severity: "success",
				text: t("requesting.staff_request.patron.success.request"),
				patronRequestLink,
			});
			setTimeout(() => {
				handleClose();
			}, 6000);
		},
		onError: (error: any) => {
			console.error("Error submitting patron request:", error.response?.data);
			setAlert({
				open: true,
				severity: "error",
				text: t(getRequestError(error.response?.data?.failedChecks), {
					code: error?.response?.data?.failedChecks[0].code,
					description: error?.response?.data?.failedChecks[0].description,
				}),
			});
		},
	});

	const validatePatron = () => {
		console.log(selectedLibrary);
		validatePatronMutation.mutate({
			patronBarcode,
			agencyCode: selectedLibrary?.value ?? agencyCode,
		});
	};

	const onSubmit = (data: StaffRequestFormData) => {
		if (!patronData || patronData.status !== "VALID") {
			setAlert({
				open: true,
				severity: "error",
				text: t("requesting.staff_request.patron.error.validate_first"),
			});
			return;
		}

		const selectedLocation = pickupLocationOptions.find(
			(option) => option.value === data.pickupLocationId
		);

		const basePayload = {
			citation: { bibClusterId },
			requestor: {
				localSystemCode: patronData.systemCode,
				localId: patronData.localPatronId[0],
				homeLibraryCode: patronData.homeLocationCode,
			},
			pickupLocation: { code: selectedLocation?.value || "" },
			requesterNote: data.requesterNote || "Staff Request",
		};

		let finalPayload;
		if (selectionType === "manual") {
			finalPayload = {
				...basePayload,
				description: `Staff Request with manual selection: ${data.requesterNote}`,
				item: {
					localId: data.itemLocalId || "",
					localSystemCode: data.itemLocalSystemCode || "",
					agencyCode: data.itemAgencyCode || "",
				},
			};
		} else {
			finalPayload = {
				...basePayload,
				description: `Staff Request: ${data.requesterNote}`,
			};
		}

		placeRequestMutation.mutate(finalPayload);
	};

	// const handleClose = () => {
	// 	reset();
	// 	setPatronValidated(false);
	// 	setPatronData(null);
	// 	placeRequestMutation.reset();
	// 	validatePatronMutation.reset();
	// 	onClose();
	// };
	const handleClose = () => {
		reset();
		setActiveStep(0);
		setPatronData(null);
		placeRequestMutation.reset();
		validatePatronMutation.reset();
		onClose();
	};

	const getStepContent = (step: number) => {
		switch (step) {
			case 0:
				return (
					<PatronValidationStep
						control={control}
						errors={errors}
						patronValidated={activeStep !== 0}
						isValidatingPatron={validatePatronMutation.isPending}
						handleClose={handleClose}
						validatePatron={validatePatron}
						patronBarcode={patronBarcode}
						agencyCode={agencyCode}
						libraryOptions={libraryOptions}
						librariesLoading={librariesDataLoading}
						t={t}
					/>
				);
			case 1:
				return (
					<StaffRequestDetailsStep
						control={control}
						errors={errors}
						watch={watch}
						setValue={setValue}
						pickupLocationOptions={sortedPickupLocationOptions}
						pickupLocationsLoading={pickupLocationsLoading}
						getPickupLocations={getPickupLocations}
						itemLibraryOptions={itemLibraryOptions}
						librariesLoading={librariesDataLoading}
						itemOptions={itemOptions}
						itemsLoading={itemsLoading}
						itemsError={itemsError}
						fetchItems={fetchItems}
						handleClose={handleClose}
						isSubmitting={placeRequestMutation.isPending}
						isValid={isValid}
						t={t}
					/>
				);
			default:
				return "Unknown step";
		}
	};

	return (
		<>
			<Dialog
				open={show}
				onClose={handleClose}
				aria-labelledby="patron-request-modal"
				fullWidth
				maxWidth="sm">
				<DialogTitle id="form-dialog-title" variant="modalTitle">
					{t("requesting.staff_request.new")}
				</DialogTitle>
				<IconButton
					aria-label="close"
					onClick={handleClose}
					sx={{
						position: "absolute",
						right: 8,
						top: 8,
						color: (theme) => theme.palette.grey[500],
					}}>
					<Close />
				</IconButton>
				<DialogContent>
					<Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 3 }}>
						{steps.map((label) => (
							<Step key={label}>
								<StepLabel>{label}</StepLabel>
							</Step>
						))}
					</Stepper>
					<form onSubmit={handleSubmit(onSubmit)}>
						{getStepContent(activeStep)}
					</form>
				</DialogContent>
			</Dialog>
			<TimedAlert
				severityType={alert.severity}
				open={alert.open}
				autoHideDuration={6000}
				onCloseFunc={() => setAlert({ ...alert, open: false })}
				alertText={
					<Trans
						i18nKey={alert.text || ""}
						components={{
							linkComponent: (
								<Link
									key="patron-request-link"
									href={alert.patronRequestLink ?? ""}
									target="_blank"
									rel="noopener noreferrer"
								/>
							),
						}}
					/>
				}
				key="staff-request-alert"
			/>
		</>
	);
}

// 	return (
// 		<>
// 			<Dialog
// 				open={show}
// 				onClose={handleClose}
// 				aria-labelledby="patron-request-modal"
// 				fullWidth
// 				maxWidth="sm">
// 				<DialogTitle id="form-dialog-title" variant="modalTitle">
// 					{t("requesting.staff_request.new")}
// 				</DialogTitle>
// 				<IconButton
// 					aria-label="close"
// 					onClick={handleClose}
// 					sx={{
// 						position: "absolute",
// 						right: 8,
// 						top: 8,
// 						color: (theme) => theme.palette.grey[500],
// 					}}>
// 					<Close />
// 				</IconButton>
// 				<DialogContent>
// 					<Typography variant="body1">
// 						{patronValidated
// 							? t("requesting.staff_request.select_pickup")
// 							: t("requesting.staff_request.patron.description")}
// 					</Typography>
// 					<form onSubmit={handleSubmit(onSubmit)}>
// 						{/* Patron validation fields */}
// 						<Controller
// 							name="agencyCode"
// 							control={control}
// 							render={({ field: { onChange, value } }) => (
// 								<Autocomplete
// 									value={
// 										libraryOptions.find((option) => option.value === value) ||
// 										null
// 									}
// 									onChange={(_, newValue) => onChange(newValue?.value || "")}
// 									options={libraryOptions}
// 									getOptionLabel={(option) => option.label}
// 									renderInput={(params) => (
// 										<TextField
// 											{...params}
// 											margin="normal"
// 											required
// 											label={t("requesting.staff_request.patron.affiliated")}
// 											error={!!errors.agencyCode}
// 											helperText={errors.agencyCode?.message}
// 										/>
// 									)}
// 									isOptionEqualToValue={(option, value) =>
// 										option.value === value.value
// 									}
// 									disabled={patronValidated}
// 								/>
// 							)}
// 						/>
// 						<Controller
// 							name="patronBarcode"
// 							control={control}
// 							render={({ field }) => (
// 								<TextField
// 									{...field}
// 									margin="normal"
// 									required
// 									fullWidth
// 									label={t("requesting.staff_request.patron.barcode")}
// 									error={!!errors.patronBarcode}
// 									helperText={errors.patronBarcode?.message}
// 									disabled={patronValidated}
// 								/>
// 							)}
// 						/>

// 						{!patronValidated ? (
// 							<Button
// 								color="primary"
// 								variant="contained"
// 								fullWidth
// 								sx={{ mt: 2 }}
// 								onClick={validatePatron}
// 								// Use the loading state from the mutation hook
// 								disabled={
// 									validatePatronMutation.isPending ||
// 									!patronBarcode ||
// 									!agencyCode
// 								}>
// 								{validatePatronMutation.isPending
// 									? t("requesting.staff_request.patron.validating")
// 									: t("requesting.staff_request.patron.validate")}
// 							</Button>
// 						) : (
// 							<>
// 								{/* Request details fields */}
// 								<Controller
// 									name="pickupLocationId"
// 									control={control}
// 									render={({ field: { onChange, value } }) => (
// 										<Autocomplete
// 											value={
// 												pickupLocationOptions.find(
// 													(option) => option.value === value
// 												) || null
// 											}
// 											onChange={(_, newValue) => {
// 												onChange(newValue?.value || "");
// 											}}
// 											options={pickupLocationOptions}
// 											// Trigger the lazy query on open
// 											onOpen={() => getPickupLocations()}
// 											loading={pickupLocationsLoading}
// 											getOptionLabel={(option) => option.label}
// 											renderInput={(params) => (
// 												<TextField
// 													{...params}
// 													margin="normal"
// 													required
// 													label={t("requesting.staff_request.patron.pickup_location")}
// 													error={!!errors.pickupLocationId}
// 													helperText={errors.pickupLocationId?.message}
// 												/>
// 											)}
// 										/>
// 									)}
// 								/>

// 								<Controller
// 									name="selectionType"
// 									control={control}
// 									render={({ field }) => (
// 										<FormControl component="fieldset" margin="normal">
// 											<FormLabel component="legend">
// 												{t("requesting.staff_request.patron.selection.type")}
// 											</FormLabel>
// 											<RadioGroup row {...field}>
// 												<Tooltip
// 													title={t(
// 														"requesting.staff_request.patron.selection.automatic_context"
// 													)}>
// 													<FormControlLabel
// 														value="automatic"
// 														control={<Radio />}
// 														label={t(
// 															"requesting.staff_request.patron.selection.automatic"
// 														)}
// 													/>
// 												</Tooltip>
// 												<Tooltip
// 													title={t(
// 														"requesting.staff_request.patron.selection.manual_context"
// 													)}>
// 													<FormControlLabel
// 														value="manual"
// 														control={<Radio />}
// 														label={t("requesting.staff_request.patron.selection.manual")}
// 													/>
// 												</Tooltip>
// 											</RadioGroup>
// 										</FormControl>
// 									)}
// 								/>

// 								{selectionType === "manual" && (
// 									<>
// 										<Controller
// 											name="itemAgencyCode"
// 											control={control}
// 											render={({ field: { onChange, value } }) => (
// 												<Autocomplete
// 													value={
// 														itemLibraryOptions.find(
// 															(option) => option.value === value
// 														) || null
// 													}
// 													onChange={(_, newValue) => {
// 														onChange(newValue?.value || "");
// 														setValue(
// 															"itemLocalSystemCode",
// 															newValue?.hostLmsCode
// 														);
// 													}}
// 													options={itemLibraryOptions}
// 													loading={librariesDataLoading}
// 													getOptionLabel={(option) => option.label}
// 													renderInput={(params) => (
// 														<TextField
// 															{...params}
// 															margin="normal"
// 															required
// 															fullWidth
// 															label={t("requesting.staff_request.patron.item_library")}
// 															error={!!errors.itemAgencyCode}
// 															helperText={errors.itemAgencyCode?.message}
// 														/>
// 													)}
// 												/>
// 											)}
// 										/>
// 										<Controller
// 											name="itemLocalId"
// 											control={control}
// 											disabled={isEmpty(itemAgencyCode)}
// 											render={({ field: { onChange, value } }) => (
// 												<Autocomplete
// 													value={
// 														itemOptions.find(
// 															(option) => option.value === value
// 														) || null
// 													}
// 													onChange={(_, newValue) => {
// 														onChange(newValue?.value || "");
// 													}}
// 													options={itemOptions}
// 													// Trigger the lazy query for items
// 													onOpen={() => {
// 														if (isEmpty(itemsData)) {
// 															fetchItems();
// 														}
// 													}}
// 													loading={itemsLoading}
// 													getOptionLabel={(option) => option.label}
// 													renderInput={(params) => (
// 														<TextField
// 															{...params}
// 															margin="normal"
// 															required
// 															disabled={isEmpty(itemAgencyCode)}
// 															fullWidth
// 															label={t("requesting.staff_request.patron.item_local_id")}
// 															error={!!errors.itemLocalId || itemsError}
// 															helperText={
// 																errors.itemLocalId?.message ||
// 																(itemsError ? t("ui.error.general") : "")
// 															}
// 														/>
// 													)}
// 												/>
// 											)}
// 										/>
// 									</>
// 								)}

// 								<Controller
// 									name="requesterNote"
// 									control={control}
// 									render={({ field }) => (
// 										<TextField
// 											{...field}
// 											margin="normal"
// 											fullWidth
// 											label={t("requesting.staff_request.patron.requester_note")}
// 											multiline
// 											rows={2}
// 										/>
// 									)}
// 								/>

// 								<Button
// 									type="submit"
// 									color="primary"
// 									variant="contained"
// 									fullWidth
// 									sx={{ mt: 2 }}
// 									// Use loading state from the mutation hook
// 									disabled={
// 										!isValid ||
// 										placeRequestMutation.isPending ||
// 										!watch("pickupLocationId")
// 									}>
// 									{placeRequestMutation.isPending
// 										? t("ui.action.submitting")
// 										: t("ui.actions.submit")}
// 								</Button>
// 							</>
// 						)}
// 					</form>
// 				</DialogContent>
// 			</Dialog>
// 			<TimedAlert
// 				severityType={alert.severity}
// 				open={alert.open}
// 				autoHideDuration={6000}
// 				onCloseFunc={() => setAlert({ ...alert, open: false })}
// 				alertText={
// 					<Trans
// 						i18nKey={alert.text || ""}
// 						components={{
// 							linkComponent: (
// 								<Link
// 									key="patron-request-link"
// 									href={alert.patronRequestLink ?? ""}
// 									target="_blank"
// 									rel="noopener noreferrer"
// 								/>
// 							),
// 						}}
// 					/>
// 				}
// 				key="staff-request-alert"
// 			/>
// 		</>
// 	);
// }
