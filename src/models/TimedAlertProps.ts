export interface TimedAlertProps {
	open: boolean;
	severityType: "success" | "info" | "warning" | "error";
	onCloseFunc: any;
	alertTitle?: string;
	alertText: any;
}
