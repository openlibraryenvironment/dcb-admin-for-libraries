import {
	Alert as MUIAlert,
	AlertTitle,
	AlertProps,
	Snackbar,
} from "@mui/material";
import { capitalize } from "@mui/material/utils";
import { forwardRef } from "react";
import { TimedAlertProps } from "../../types/TimedAlertProps";

const SnackbarAlert = forwardRef<HTMLDivElement, AlertProps>(
	function Alert(props, ref) {
		return <MUIAlert elevation={6} ref={ref} {...props} />;
	}
);

export default function TimedAlert({
	open,
	autoHideDuration,
	onCloseFunc,
	severityType,
	alertTitle,
	alertText,
}: TimedAlertProps) {
	return (
		<>
			<Snackbar
				open={open}
				autoHideDuration={autoHideDuration}
				onClose={onCloseFunc}>
				<SnackbarAlert
					severity={severityType}
					onClose={onCloseFunc}
					sx={{ maxWidth: "700px" }}>
					<AlertTitle>{alertTitle ?? capitalize(severityType)}</AlertTitle>
					{alertText}
				</SnackbarAlert>
			</Snackbar>
		</>
	);
}
