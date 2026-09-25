import {
	Alert as MUIAlert,
	AlertTitle,
	AlertProps,
	Snackbar,
} from "@mui/material";
import { forwardRef } from "react";
import { useTranslation } from "react-i18next";
import { TimedAlertProps } from "../../models/TimedAlertProps";

const SnackbarAlert = forwardRef<HTMLDivElement, AlertProps>(
	function Alert(props, ref) {
		return <MUIAlert elevation={6} ref={ref} {...props} />;
	},
);

/** What a caller gets when it says nothing about timing. */
const DEFAULT_DURATION = 6000;

export default function TimedAlert({
	open,
	autoHideDuration,
	onCloseFunc,
	severityType,
	alertTitle,
	alertText,
}: TimedAlertProps) {
	const { t } = useTranslation();

	// An error does not dismiss itself. WCAG 2.2.1 asks that a time limit be
	// adjustable, and a message telling somebody their edit did not save is the
	// one they most need time to read and act on. Snackbar takes null as "stay
	// until dismissed", so an error ignores whatever a caller passed.
	const duration =
		severityType === "error" ? null : (autoHideDuration ?? DEFAULT_DURATION);

	return (
		<Snackbar
			open={open}
			autoHideDuration={duration}
			onClose={onCloseFunc}>
			<SnackbarAlert
				severity={severityType}
				onClose={onCloseFunc}
				sx={{ maxWidth: "700px" }}>
				<AlertTitle>
					{alertTitle ?? t(`common.severity.${severityType}`)}
				</AlertTitle>
				{alertText}
			</SnackbarAlert>
		</Snackbar>
	);
}
