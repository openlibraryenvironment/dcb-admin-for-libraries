import ExpeditedCheckout from "@forms/ExpeditedCheckout/ExpeditedCheckout";
import StaffRequest from "@forms/StaffRequest/StaffRequest";
import { PatronRequestFormType } from "@models/PatronRequestFormType";
import Close from "@mui/icons-material/Close";
import {
	Button,
	DialogActions,
	DialogTitle,
	FormControl,
	FormControlLabel,
	FormLabel,
	IconButton,
	Radio,
	RadioGroup,
	Stack,
	Typography,
} from "@mui/material";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import { useState } from "react";
import { useTranslation } from "react-i18next";
type RequestType = "staffRequest" | "expeditedCheckout";

export default function CombinedRequestingModal({
	show,
	onClose,
	bibClusterId,
	title,
}: PatronRequestFormType) {
	const { t } = useTranslation();
	const [requestType, setRequestType] = useState<RequestType | null>(null);
	const [selectedValue, setSelectedValue] =
		useState<RequestType>("staffRequest");

	const handleClose = () => {
		setRequestType(null);
		setSelectedValue("staffRequest");
		onClose();
	};

	const handleContinue = () => {
		setRequestType(selectedValue);
	};

	const handleRadioChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		setSelectedValue(event.target.value as RequestType);
	};

	const renderContent = () => {
		switch (requestType) {
			case "staffRequest":
				return (
					<StaffRequest
						bibClusterId={bibClusterId}
						onClose={handleClose}
						show={show}
						title={title}
					/>
				);
			case "expeditedCheckout":
				return (
					<ExpeditedCheckout
						bibClusterId={bibClusterId}
						onClose={handleClose}
						show={show}
						title={title}
					/>
				);
			default:
				// This is the initial selection screen
				return (
					<>
						<DialogContent>
							<Stack spacing={1}>
								<Typography variant="body1">
									{t("requesting.place_description", { title: title })}
								</Typography>
								<FormControl component="fieldset">
									<Stack spacing={1} direction={"column"}>
										<FormLabel component="legend">
											<Typography variant="hitCount">
												{t("requesting.options")}
											</Typography>
										</FormLabel>
										<RadioGroup
											aria-label="request-type"
											name="request-type-group"
											value={selectedValue}
											onChange={handleRadioChange}>
											<Stack spacing={1}>
												<FormControlLabel
													value="staffRequest"
													control={<Radio />}
													label={
														<>
															<Typography variant="body1">
																{t("requesting.staff_request.actions.place")}
															</Typography>
															<Typography
																variant="body2"
																color="text.secondary">
																{t(
																	"requesting.staff_request.option_description"
																)}
															</Typography>
														</>
													}
												/>
												<FormControlLabel
													value="expeditedCheckout"
													control={<Radio />}
													label={
														<>
															<Typography variant="body1">
																{t(
																	"requesting.expedited_checkout.actions.place"
																)}
															</Typography>
															<Typography
																variant="body2"
																color="text.secondary">
																{t(
																	"requesting.expedited_checkout.option_description"
																)}
															</Typography>
														</>
													}
												/>
											</Stack>
										</RadioGroup>
									</Stack>
								</FormControl>
							</Stack>
						</DialogContent>
						<DialogActions>
							<Button onClick={handleClose}>{t("ui.actions.cancel")}</Button>
							<Button onClick={handleContinue} variant="contained">
								{t("ui.actions.continue")}
							</Button>
						</DialogActions>
					</>
				);
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
					{t("requesting.place_title", { title: title })}
					{/** We will need to do the same thing here and cut off the title after a certain point, but offer the option to expand  */}
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
				{renderContent()}
			</Dialog>
		</>
	);
}
