import {
	Alert as MUIAlert,
	AlertTitle,
	AlertProps,
	Snackbar,
} from "@mui/material";
import { forwardRef } from "react";
import { useTranslation } from "react-i18next";
import { TimedAlertProps } from "../../models/TimedAlertProps";
import { autoHideFor } from "./autoHideFor";

const SnackbarAlert = forwardRef<HTMLDivElement, AlertProps>(
	function Alert(props, ref) {
		return <MUIAlert elevation={6} ref={ref} {...props} />;
	},
);

export default function TimedAlert({
	open,
	onCloseFunc,
	severityType,
	alertTitle,
	alertText,
}: TimedAlertProps) {
	const { t } = useTranslation();

	return (
		<Snackbar
			open={open}
			autoHideDuration={autoHideFor(severityType)}
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
