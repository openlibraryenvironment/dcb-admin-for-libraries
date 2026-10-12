import { availabilityQueryOptions } from "@helpers/availabilityApi";
import { REFERENCE_LIST_PAGE_SIZE } from "@constants/dataGrid/pagination";
import { FormEvent, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { staffRequestSchema } from "@/schemas/staffRequest";
import {
	Alert,
	DialogContent,
	Step,
	StepLabel,
	Stepper,
	Typography,
} from "@mui/material";
import { CustomLink } from "@components/CustomLink";
import { Trans, useTranslation } from "react-i18next";
import TimedAlert from "@components/TimedAlert/TimedAlert";
import { getLibraries } from "@queries/getLibraries";
import { getLocations } from "@queries/getLocations";
import axios, { AxiosError } from "axios";
import { useAuth } from "react-oidc-context";
import { useAgencyCodes } from "@/hooks/useAgencyCodes";
import StepAnnouncement from "@components/StepAnnouncement/StepAnnouncement";
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
import { useRouter } from "@tanstack/react-router";
import DCBStepIcon from "@components/DCBStepIcon/DCBStepIcon";
import { StatusStepConnector } from "@components/StatusStepConnector/StatusStepConnector";
import {
	getStepColors,
	getStepLabelFontWeight,
} from "@helpers/getStepLabelStyles";

export default function StaffRequest({
	onClose,
	bibClusterId,
}: PatronRequestFormType) {
	const { t } = useTranslation();
	const auth = useAuth();
	const headers = useMemo(
		() => ({
			Authorization: `Bearer ${auth.user?.access_token}`,
		}),
		[auth.user?.access_token],
	);
	const router = useRouter();
	const { cfg } = router.options.context;
	// The library this request is placed on behalf of. Read through useAgencyCodes
	// because the claim can name several and this needs the one being looked at, not
	// all of them run together.
	const { agencyCode: selectedAgencyCode } = useAgencyCodes();
	const agencyCode = selectedAgencyCode ?? "";

	const [alert, setAlert] = useState<{
		open: boolean;
		severity: "success" | "error";
		text: string;
	}>({
		open: false,
		severity: "success",
		text: "",
	});

	const [activeStep, setActiveStep] = useState(0);
	const [patronData, setPatronData] = useState<PatronLookupResponse | null>(
		null,
	);
	const [stepError, setStepError] = useState<number | null>(null);

	const steps = [
		t("requesting.expedited_checkout.steps.patron_validation"),
		t("requesting.expedited_checkout.steps.request_creation"),
	];
	const isReadOnly = auth.user?.profile?.roles?.includes("LIBRARY_READ_ONLY");

	const validationSchema = useMemo(() => staffRequestSchema(t), [t]);

	const {
		control,
		handleSubmit,
		reset,
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
			itemAgencyCode: "",
		},
		resolver: yupResolver(validationSchema),
		mode: "onChange",
	});

	const [selectionType, patronAgencyCode, itemAgencyCode, patronBarcode] =
		useWatch({
			control,
			name: ["selectionType", "agencyCode", "itemAgencyCode", "patronBarcode"],
		});

	const { data: librariesData, isLoading: librariesDataLoading } =
		useQuery<LibrariesQueryData>({
			queryKey: ["librariesInfo", headers, cfg.VITE_DCB_API_BASE],
			queryFn: () =>
				request(
					`${cfg.VITE_DCB_API_BASE}/graphql`,
					getLibraries,
					{
						order: "fullName",
						orderBy: "ASC",
						pageno: 0,
						pagesize: REFERENCE_LIST_PAGE_SIZE,
						query: "",
					},
					headers,
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
			}),
		) || [];

	const selectedLibrary = libraryOptions.find(
		(option) => option.value === patronAgencyCode,
	);
	const isPickupAnywhere = !!selectedLibrary?.functionalSettings?.some(
		(setting) => setting.name === "PICKUP_ANYWHERE" && setting.enabled === true,
	); // This still matters in the context of staff requesting. However, pickup locations from the user's agency should be prioritised.

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
			cfg.VITE_DCB_API_BASE,
		],
		queryFn: () => {
			const locationQuery = isPickupAnywhere
				? "agency:" +
					selectedLibrary?.agencyId +
					" OR isEnabledForPickupAnywhere:true"
				: "agency:" + selectedLibrary?.agencyId;
			return request(
				`${cfg.VITE_DCB_API_BASE}/graphql`,
				getLocations,
				{
					order: "name",
					orderBy: "ASC",
					pageno: 0,
					pagesize: REFERENCE_LIST_PAGE_SIZE,
					query: locationQuery,
				},
				headers,
			);
		},
		enabled: false,
	});

	// Asked once, when manual selection is chosen, and usually not even then: the
	// record page and the search card hold the same cache entry. Never refetch():
	// it ignores staleTime and fans out to every member LMS.
	const {
		data: availabilityResults,
		isLoading: itemsLoading,
		isError: itemsError,
	} = useQuery({
		...availabilityQueryOptions(cfg.VITE_DCB_API_BASE, bibClusterId),
		enabled: activeStep === 1 && selectionType === "manual" && !!bibClusterId,
	});

	const itemsData: Item[] = availabilityResults?.itemList || [];
	const filteredItems = itemsData.filter(
		(item) => item?.agency?.code === itemAgencyCode,
	);

	const pickupLocationOptions: PatronRequestAutocompleteOption[] =
		pickupLocations?.locations?.content?.map(
			(item: { name: string; id: string; code: string }) => ({
				label: item.name,
				value: item.id,
				code: item.code,
			}),
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
					t("requesting.staff_request.patron.pickup_location_no_agency"),
				agencyCode: item?.agency?.code,
			}),
		);
		return options.sort((a: any, b: any) => {
			const isAUserAgency = a.agencyCode === agencyCode;
			const isBUserAgency = b.agencyCode === agencyCode;
			if (isAUserAgency && !isBUserAgency) return -1;
			if (!isAUserAgency && isBUserAgency) return 1;
			if (a.agencyName && b.agencyName && a.agencyName !== b.agencyName) {
				return a.agencyName.localeCompare(b.agencyName);
			}
			return a.label.localeCompare(b.label);
		});
	}, [pickupLocations?.locations?.content, t, agencyCode]);

	const itemLibraryOptions: PatronRequestAutocompleteOption[] =
		librariesData?.libraries?.content?.map(
			(item: { fullName: string; agencyCode: string; agency: Agency }) => ({
				label: item.fullName,
				value: item.agencyCode,
				hostLmsCode: item?.agency?.hostLms?.code,
			}),
		) || [];

	const itemOptions: PatronRequestAutocompleteOption[] =
		filteredItems?.map(
			(item: {
				id: string;
				agency: Agency;
				location: Location;
				barcode: string;
				dueDate?: string;
				callNumber?: string;
				parsedVolumeStatement?: string;
			}) => ({
				label: item?.parsedVolumeStatement
					? t("requesting.staff_request.patron.item_select_volume", {
							name: item?.location.name,
							barcode: item.barcode,
							callNo: item?.callNumber,
							volumeStatement: item?.parsedVolumeStatement,
						})
					: t("requesting.staff_request.patron.item_select", {
							name: item?.location.name,
							barcode: item.barcode,
							callNo: item?.callNumber,
						}),

				value: item.id,
				dueDate: item?.dueDate,
			}),
		) || [];

	const validatePatronMutation = useMutation<
		PatronLookupResponse,
		unknown,
		{ patronBarcode: string; agencyCode: string }
	>({
		mutationFn: (variables) =>
			axios
				.post(
					`${cfg.VITE_DCB_API_BASE}/patron/auth/lookup`,
					{
						patronPrinciple: variables.patronBarcode,
						agencyCode: variables.agencyCode,
					},
					{ headers },
				)
				.then((res) => res.data),
		onSuccess: (data, variables) => {
			if (data.status === "VALID") {
				setPatronData(data);
				setActiveStep(1);
				setStepError(null);
				setAlert({
					open: true,
					severity: "success",
					text: t("requesting.staff_request.patron.success.lookup", {
						barcode: variables.patronBarcode,
						library: selectedLibrary?.label ?? variables.agencyCode,
					}),
				});
			} else {
				setAlert({
					open: true,
					severity: "error",
					text: t("requesting.staff_request.patron.error.validation_failure"),
				});
				setStepError(0);
			}
		},
		onError: () => {
			setAlert({
				open: true,
				severity: "error",
				text: t("requesting.staff_request.patron.error.validation_failure"),
			});
			setStepError(0);
		},
	});

	const placeRequestMutation = useMutation<
		PlaceRequestResponse,
		AxiosError,
		any
	>({
		mutationFn: (payload) =>
			axios
				.post(`${cfg.VITE_DCB_API_BASE}/patrons/requests/place`, payload, {
					headers,
				})
				.then((res) => res.data),
		onSuccess: () => {
			setStepError(null);
		},
		onError: (error: any) => {
			setAlert({
				open: true,
				severity: "error",
				text: getRequestError(error?.response?.data?.failedChecks, t),
			});
			setStepError(1);
		},
	});

	// The patron's own library, never the staff member's: with the patron library
	// cleared, the lookup used to fall back to the staff member's and validate the
	// barcode against the wrong library. The button is disabled without one.
	const validatePatron = () => {
		if (!patronBarcode || !patronAgencyCode) return;
		validatePatronMutation.mutate({
			patronBarcode,
			agencyCode: patronAgencyCode,
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
			(option) => option.value === data.pickupLocationId,
		);

		const basePayload = {
			citation: { bibClusterId },
			requestor: {
				localSystemCode: patronData.systemCode,
				localId: patronData.localPatronId[0],
				homeLibraryCode: patronData.homeLocationCode,
				agencyCode: patronData.agencyCode,
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

	const submitStep = (event: FormEvent<HTMLFormElement>) => {
		if (activeStep === 0) {
			event.preventDefault();
			validatePatron();
			return;
		}
		// Placed once: the same submission twice is a duplicate request.
		if (placeRequestMutation.isSuccess) {
			event.preventDefault();
			return;
		}
		return handleSubmit(onSubmit)(event);
	};

	const handleClose = () => {
		reset();
		setActiveStep(0);
		setPatronData(null);
		placeRequestMutation.reset();
		validatePatronMutation.reset();
		setStepError(null);
		onClose();
	};

	const placedRequestId = placeRequestMutation.data?.id;

	const getStepContent = (step: number) => {
		switch (step) {
			case 0:
				return (
					<PatronValidationStep
						control={control}
						patronValidated={activeStep !== 0}
						isValidatingPatron={validatePatronMutation.isPending}
						handleClose={handleClose}
						patronBarcode={patronBarcode}
						agencyCode={patronAgencyCode}
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
						setValue={setValue}
						pickupLocationOptions={sortedPickupLocationOptions}
						pickupLocationsLoading={pickupLocationsLoading}
						getPickupLocations={getPickupLocations}
						itemLibraryOptions={itemLibraryOptions}
						librariesLoading={librariesDataLoading}
						itemOptions={itemOptions}
						itemsLoading={itemsLoading}
						itemsError={itemsError}
						handleClose={handleClose}
						isSubmitting={placeRequestMutation.isPending}
						isPlaced={placeRequestMutation.isSuccess}
						isValid={isValid}
						t={t}
					/>
				);
			default:
				return null;
		}
	};

	return (
		<>
			<DialogContent>
				<Stepper
					activeStep={activeStep}
					alternativeLabel
					sx={{ mb: 4 }}
					connector={
						<StatusStepConnector
							stepError={stepError}
							activeStep={activeStep}
						/>
					}>
					{steps.map((label, index) => {
						const stepProps: { completed?: boolean } = {};
						const labelProps: {
							error?: boolean;
						} = {};
						const isActive = index === activeStep;
						const isCompleted = index < activeStep;
						const hasError = stepError === index;

						if (isCompleted) {
							stepProps.completed = true;
						}
						if (hasError) {
							labelProps.error = true;
						}

						return (
							<Step key={label} {...stepProps}>
								<StepLabel {...labelProps} slots={{ stepIcon: DCBStepIcon }}>
									<Typography
										color={getStepColors(isActive, hasError, isCompleted)}
										sx={{
											fontWeight: getStepLabelFontWeight(isActive),
										}}>
										{label}
									</Typography>
								</StepLabel>
							</Step>
						);
					})}
				</Stepper>
				<StepAnnouncement activeStep={activeStep} steps={steps} />
				<form onSubmit={submitStep}>{getStepContent(activeStep)}</form>
				{/* In the dialog rather than a toast, so the link stays until the user
				    closes it: WCAG 2.2.1. */}
				{placedRequestId ? (
					<Alert severity="success" sx={{ mt: 2 }}>
						{isReadOnly ? (
							t("requesting.staff_request.patron.success.request_requesting_only")
						) : (
							<Trans
								i18nKey="requesting.staff_request.patron.success.request"
								components={{
									linkComponent: (
										<CustomLink
											key="patron-request-link"
											to="/patronRequests/$id"
											params={{ id: placedRequestId }}
											target="_blank"
											rel="noopener noreferrer"
										/>
									),
								}}
							/>
						)}
					</Alert>
				) : null}
			</DialogContent>
			<TimedAlert
				severityType={alert.severity}
				open={alert.open}
				onCloseFunc={() => setAlert({ ...alert, open: false })}
				alertText={alert.text}
				key="staff-request-alert"
			/>
		</>
	);
}
