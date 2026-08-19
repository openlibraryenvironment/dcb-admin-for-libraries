import { PatronRequestAutocompleteOption } from "@models/PatronRequestAutocompleteOption";
import {
	Autocomplete,
	Button,
	Stack,
	TextField,
	Typography,
} from "@mui/material";
import { TFunction } from "i18next";
import { Control, Controller, FieldValues, Path } from "react-hook-form";

// Step 1: Patron Validation Component: this is step 1 in the expedited checkout workflow.
// Three forms share it - expedited checkout, quick walk-up and staff request - and
// they agree only on the two fields this step drives, so it is generic over any form
// carrying them rather than typed to one form's shape.
export interface PatronValidationFields extends FieldValues {
	patronBarcode: string;
	agencyCode: string;
}

interface PatronValidationStepType<TFieldValues extends PatronValidationFields> {
	control: Control<TFieldValues>;
	patronValidated: boolean;
	isValidatingPatron: boolean;
	handleClose: () => void;
	validatePatron: () => void;
	patronBarcode: string;
	agencyCode: string;
	libraryOptions: PatronRequestAutocompleteOption[];
	librariesLoading: boolean;
	t: TFunction;
}
export const PatronValidationStep = <TFieldValues extends PatronValidationFields>({
	control,
	patronValidated,
	isValidatingPatron,
	handleClose,
	validatePatron,
	patronBarcode,
	agencyCode,
	libraryOptions,
	librariesLoading,
	t,
}: PatronValidationStepType<TFieldValues>) => {
	// The constraint guarantees both fields exist, but TypeScript cannot narrow a
	// generic form's Path union to a string literal, so the two names are asserted
	// here once instead of at every use.
	const agencyCodeName = "agencyCode" as Path<TFieldValues>;
	const patronBarcodeName = "patronBarcode" as Path<TFieldValues>;

	return (
		<>
			<Typography variant="body1">
				{t("requesting.expedited_checkout.steps.patron_validation_instruction")}
			</Typography>
			{/* The library of the patron. Could be a visiting patron, so this is not restricted */}
			<Controller
				name={agencyCodeName}
				control={control}
				render={({ field: { onChange, value }, fieldState: { error } }) => (
					<Autocomplete
						value={
							value
								? (libraryOptions.find((option) => option.value === value) ??
									null)
								: null
						}
						onChange={(_, newValue) => {
							onChange(newValue?.value ?? "");
						}}
						options={libraryOptions}
						loading={librariesLoading}
						getOptionLabel={(option) => option.label}
						renderInput={(params) => (
							<TextField
								{...params}
								margin="normal"
								required
								label={t("requesting.staff_request.patron.affiliated")}
								error={!!error}
								helperText={error?.message}
							/>
						)}
						isOptionEqualToValue={(option, value) =>
							option.value === value.value
						}
					/>
				)}
			/>

			<Controller
				name={patronBarcodeName}
				control={control}
				render={({ field, fieldState: { error } }) => (
					<TextField
						{...field}
						margin="normal"
						required
						fullWidth
						id="patronBarcode"
						label={t("requesting.staff_request.patron.barcode")}
						error={!!error}
						helperText={error?.message}
						disabled={patronValidated}
					/>
				)}
			/>
			<Stack spacing={1} direction={"row"}>
				<Button variant="outlined" onClick={handleClose}>
					{t("ui.actions.cancel")}
				</Button>
				<div style={{ flex: "1 0 0" }} />
				<Button
					color="primary"
					variant="contained"
					onClick={validatePatron}
					disabled={isValidatingPatron || !patronBarcode || !agencyCode}>
					{isValidatingPatron
						? t("requesting.staff_request.patron.validating")
						: t("requesting.staff_request.patron.validate")}
				</Button>
			</Stack>
		</>
	);
};
