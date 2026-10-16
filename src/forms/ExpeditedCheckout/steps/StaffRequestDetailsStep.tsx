import { useEffect, useRef } from "react";
import {
	Autocomplete,
	Button,
	FormControl,
	FormControlLabel,
	FormLabel,
	Radio,
	RadioGroup,
	Stack,
	TextField,
	Typography,
} from "@mui/material";
import { PatronRequestAutocompleteOption } from "@models/PatronRequestAutocompleteOption";
import { StaffRequestFormData } from "@models/StaffRequestFormData";
import { TFunction } from "i18next";
import {
	Control,
	Controller,
	FieldErrors,
	UseFormSetValue,
	useWatch,
} from "react-hook-form";

interface StaffRequestDetailsStepProps {
	control: Control<StaffRequestFormData, any>;
	errors: FieldErrors<StaffRequestFormData>;
	setValue: UseFormSetValue<StaffRequestFormData>;
	pickupLocationOptions: PatronRequestAutocompleteOption[];
	pickupLocationsLoading: boolean;
	getPickupLocations: () => void;
	itemLibraryOptions: PatronRequestAutocompleteOption[];
	librariesLoading: boolean;
	itemOptions: PatronRequestAutocompleteOption[];
	itemsLoading: boolean;
	itemsError: boolean;
	handleClose: () => void;
	isSubmitting: boolean;
	/** Placed already: a second submission would be a duplicate request. */
	isPlaced: boolean;
	t: TFunction;
}

export const StaffRequestDetailsStep = ({
	control,
	errors,
	setValue,
	pickupLocationOptions,
	pickupLocationsLoading,
	getPickupLocations,
	itemLibraryOptions,
	librariesLoading,
	itemOptions,
	itemsLoading,
	itemsError,
	handleClose,
	isSubmitting,
	isPlaced,
	t,
}: StaffRequestDetailsStepProps) => {
	// useWatch rather than the form's watch: the subscription belongs to
	// whichever component called useForm, so reading it here re-rendered the whole
	// StaffRequest form on every keystroke in these three fields.
	const [selectionType, itemAgencyCode] = useWatch({
		control,
		name: ["selectionType", "itemAgencyCode"],
	});

	// The Validate button that had focus went with the step before this one
	const pickupLocationRef = useRef<HTMLInputElement>(null);
	useEffect(() => {
		pickupLocationRef.current?.focus();
	}, []);

	return (
		<>
			<Typography variant="body1">
				{t("requesting.staff_request.select_pickup")}
			</Typography>

			<Controller
				name="pickupLocationId"
				control={control}
				render={({ field: { onChange, value } }) => (
					<Autocomplete
						value={
							pickupLocationOptions.find((option) => option.value === value) ||
							null
						}
						onChange={(_, newValue) => onChange(newValue?.value || "")}
						options={pickupLocationOptions}
						onOpen={getPickupLocations}
						loading={pickupLocationsLoading}
						getOptionLabel={(option) => option.label}
						groupBy={(option) => option.agencyName || ""}
						renderInput={(params) => (
							<TextField
								{...params}
								inputRef={pickupLocationRef}
								margin="normal"
								required
								label={t("requesting.staff_request.patron.pickup_location")}
								error={!!errors.pickupLocationId}
								helperText={errors.pickupLocationId?.message}
							/>
						)}
					/>
				)}
			/>

			<Controller
				name="selectionType"
				control={control}
				render={({ field }) => (
					<FormControl component="fieldset" margin="normal">
						<FormLabel component="legend">
							{t("requesting.staff_request.patron.selection.type")}
						</FormLabel>
						{/* Visible text, as in the request type choice: a tooltip replaced
						    the radio's accessible name and never reached a touch user. */}
						<RadioGroup {...field}>
							<FormControlLabel
								value="automatic"
								control={<Radio />}
								label={
									<>
										<Typography variant="body1">
											{t("requesting.staff_request.patron.selection.automatic")}
										</Typography>
										<Typography variant="body2" sx={{ color: "text.secondary" }}>
											{t(
												"requesting.staff_request.patron.selection.automatic_context",
											)}
										</Typography>
									</>
								}
							/>
							<FormControlLabel
								value="manual"
								control={<Radio />}
								label={
									<>
										<Typography variant="body1">
											{t("requesting.staff_request.patron.selection.manual")}
										</Typography>
										<Typography variant="body2" sx={{ color: "text.secondary" }}>
											{t("requesting.staff_request.patron.selection.manual_context")}
										</Typography>
									</>
								}
							/>
						</RadioGroup>
					</FormControl>
				)}
			/>

			{selectionType === "manual" && (
				<>
					<Controller
						name="itemAgencyCode"
						control={control}
						render={({ field: { onChange, value } }) => (
							<Autocomplete
								value={
									itemLibraryOptions.find((option) => option.value === value) ||
									null
								}
								onChange={(_, newValue) => {
									onChange(newValue?.value || "");
									setValue("itemLocalSystemCode", newValue?.hostLmsCode);
									// The item is one of the old library's; its local id may name another item at the new one
									setValue("itemLocalId", "", { shouldValidate: true });
								}}
								options={itemLibraryOptions}
								loading={librariesLoading}
								getOptionLabel={(option) => option.label}
								renderInput={(params) => (
									<TextField
										{...params}
										margin="normal"
										required
										fullWidth
										label={t("requesting.staff_request.patron.item_library")}
										error={!!errors.itemAgencyCode}
										helperText={errors.itemAgencyCode?.message}
									/>
								)}
							/>
						)}
					/>
					<Controller
						name="itemLocalId"
						control={control}
						disabled={!itemAgencyCode}
						render={({ field: { onChange, value } }) => (
							<Autocomplete
								value={
									itemOptions.find((option) => option.value === value) || null
								}
								onChange={(_, newValue) => onChange(newValue?.value || "")}
								options={itemOptions}
								loading={itemsLoading}
								// On the Autocomplete, not the TextField: there it greyed the label
								// and left the input focusable and enabled.
								disabled={!itemAgencyCode}
								getOptionLabel={(option) => option.label}
								renderInput={(params) => (
									<TextField
										{...params}
										margin="normal"
										required
										fullWidth
										label={t("requesting.staff_request.patron.item_local_id")}
										error={!!errors.itemLocalId || itemsError}
										helperText={
											errors.itemLocalId?.message ||
											(itemsError ? t("ui.feedback.error.general") : "")
										}
									/>
								)}
							/>
						)}
					/>
				</>
			)}

			<Controller
				name="requesterNote"
				control={control}
				render={({ field }) => (
					<TextField
						{...field}
						margin="normal"
						fullWidth
						label={t("requesting.staff_request.patron.requester_note")}
						multiline
						rows={2}
					/>
				)}
			/>

			<Stack spacing={1} direction={"row"} sx={{ mt: 2 }}>
				<Button variant="outlined" onClick={handleClose}>
					{t("ui.actions.cancel")}
				</Button>
				<div style={{ flex: "1 0 0" }} />
				<Button
					type="submit"
					color="primary"
					variant="contained"
					// Enabled while incomplete: submitting says what is missing, field by field
					disabled={isSubmitting || isPlaced}>
					{isSubmitting ? t("ui.actions.submitting") : t("ui.actions.submit")}
				</Button>
			</Stack>
		</>
	);
};
