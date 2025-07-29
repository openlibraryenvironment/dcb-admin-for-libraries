import { useTranslation } from "react-i18next";
import { ConfirmationType } from "../../models/ConfirmationType";
import { getEntityText } from "../../helpers/confirmationFunctions";
import {
	Autocomplete,
	Box,
	Button,
	CircularProgress,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	Divider,
	Stack,
	TextField,
	Typography,
} from "@mui/material";
import ChangesSummary from "../ChangesSummary/ChangesSummary";
import * as Yup from "yup";
import { useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { ConfirmationForm } from "@models/ConfirmationForm";
import { yupResolver } from "@hookform/resolvers/yup";

const Confirmation = ({
	open,
	onClose,
	onConfirm,
	editInformation,
	action, // The action to be confirmed
	// entityType, // The type of entity being acted upon- i.e. library
	entityName, // The name of the entity
	gridEdit, // boolean value for grid editing
}: ConfirmationType) => {
	const { t } = useTranslation();

	const getCharCountHelperText = (
		value: string,
		maxLength: number,
		baseHelperText: string
	) => {
		const remainingChars = maxLength - value.length;
		if (remainingChars <= 0) {
			return t("data_change_log.max_length_exceeded", { maxLength });
		}
		if (remainingChars <= 20) {
			return `${baseHelperText} (${t("data_change_log.characters_remaining", { characters: remainingChars })})`;
		}
		return baseHelperText;
	};
	const validationSchema = useMemo(
		() =>
			Yup.object({
				reason: Yup.string()
					.required(t("data_change_log.reason_required"))
					.max(200, t("data_change_log.max_length_exceeded")),
				changeCategory: Yup.string()
					.required(t("data_change_log.category_required"))
					.max(200, t("data_change_log.max_length_exceeded")),
				changeReferenceUrl: Yup.string()
					.url(t("ui.data_grid.edit_url"))
					.typeError(t("ui.data_grid.edit_url"))
					.max(200, t("data_change_log.max_length_exceeded")),
			}),
		[t]
	);
	const {
		control,
		handleSubmit,
		reset,
		formState: { errors, isValid, isDirty, isSubmitting },
	} = useForm<ConfirmationForm>({
		defaultValues: {
			reason: "",
			changeCategory: "",
			changeReferenceUrl: "",
		},
		resolver: yupResolver(validationSchema),
		mode: "onChange",
	});

	const getHeaderText = () => {
		switch (action) {
			case "deletion":
				return t("ui.data_grid.delete_header", {
					entity: t("ui.info.contact"),
					name: entityName,
				});
			case "gridEdit":
			case "pageEdit":
				return t("ui.data_grid.edit_summary", {
					entity: gridEdit
						? t(getEntityText(entityName, gridEdit)).toLowerCase()
						: entityName,
				});
		}
	};

	const getDialogContent = () => {
		switch (action) {
			case "deletion":
				return (
					<Box>
						<Typography variant="body1">
							{t("ui.data_grid.delete_body_library")}
						</Typography>
					</Box>
				);
			case "gridEdit":
			case "pageEdit":
				return (
					<ChangesSummary
						changes={editInformation}
						action="UPDATE"
						context="edit"
					/>
				);
		}
	};
	const getButtonText = () => {
		switch (action) {
			case "gridEdit":
			case "pageEdit":
				return t("ui.actions.confirm_changes");
		}
	};
	const onSubmit = async (data: ConfirmationForm) => {
		onConfirm(data.reason, data.changeCategory, data.changeReferenceUrl ?? "");
		reset();
	};
	const handleClose = () => {
		reset();
		onClose();
	};
	return (
		<Dialog
			open={open}
			onClose={handleClose}
			aria-labelledby="confirmation-modal"
			fullWidth>
			{/* // Enforcing the style of bold, centered modal or dialog headers */}
			<DialogTitle variant="modalTitle">{getHeaderText()}</DialogTitle>
			<Divider aria-hidden="true"></Divider>
			<DialogContent>
				<Box
					component="form"
					onSubmit={handleSubmit(onSubmit)}
					sx={{
						display: "flex",
						flexDirection: "column",
						gap: 2,
						mt: 2,
					}}>
					<Stack direction="column" spacing={2}>
						{getDialogContent()}
						{action !== "unsavedChanges" ? (
							<>
								<Controller
									name="changeCategory"
									control={control}
									render={({ field }) => (
										<Autocomplete
											{...field}
											options={[
												t("data_change_log.categories.error_correction"),
												t("data_change_log.categories.details_changed"),
												t("data_change_log.categories.new_member"),
												t("data_change_log.categories.membership_ended"),
												t("data_change_log.categories.additional_information"),
												t("data_change_log.categories.changing_status"),
												t("data_change_log.categories.initial_setup"),
												t("data_change_log.categories.mappings_replacement"),
												t("data_change_log.categories.other"),
											]}
											value={field.value || null}
											onChange={(_, newValue) => field.onChange(newValue)}
											// disabled={doPatronRequestsExist}
											renderInput={(params) => (
												<TextField
													{...params}
													required
													label={t("data_change_log.category")}
													error={!!errors.changeCategory}
													helperText={errors.changeCategory?.message}
												/>
											)}
											isOptionEqualToValue={(option, value) =>
												option === value || (!option && !value)
											}
										/>
									)}
								/>
								<Controller
									name="reason"
									control={control}
									render={({ field }) => (
										<TextField
											{...field}
											fullWidth
											required
											multiline
											variant="outlined"
											label={t("data_change_log.reason")}
											margin="normal"
											// disabled={doPatronRequestsExist}
											error={!!errors.reason}
											helperText={errors.reason?.message}
											inputProps={{ maxLength: 200 }}
										/>
									)}
								/>

								<Controller
									name="changeReferenceUrl"
									control={control}
									render={({ field }) => (
										<TextField
											{...field}
											fullWidth
											variant="outlined"
											label={t("data_change_log.reference_url")}
											margin="normal"
											// disabled={doPatronRequestsExist}
											error={!!errors.changeReferenceUrl}
											helperText={
												errors.changeReferenceUrl?.message ||
												getCharCountHelperText(
													field.value ?? "",
													200,
													t("data_change_log.ref_url_helper")
												)
											}
											inputProps={{ maxLength: 200 }}
										/>
									)}
								/>
							</>
						) : null}
					</Stack>
				</Box>
				<DialogActions>
					<Button onClick={handleClose} variant="outlined" color="primary">
						{action == "unsavedChanges"
							? t("ui.unsaved_changes.keep_editing")
							: t("ui.actions.cancel")}
					</Button>
					<div style={{ flex: "1 0 0" }} />
					{action == "unsavedChanges" ? (
						<Button
							onClick={() => {
								onConfirm("", "", "");
								reset();
							}}
							color="primary"
							variant="contained">
							{getButtonText()}
						</Button>
					) : (
						<Button
							type="submit"
							color="primary"
							variant="contained"
							onClick={handleSubmit(onSubmit)}
							disabled={
								!isValid || !isDirty || isSubmitting
								// || doPatronRequestsExist
							}>
							{getButtonText()}
							{isSubmitting ? (
								<CircularProgress
									color="inherit"
									size={13}
									sx={{ marginLeft: "10px" }}
								/>
							) : null}
						</Button>
					)}
				</DialogActions>
			</DialogContent>
		</Dialog>
	);
};
export default Confirmation;
