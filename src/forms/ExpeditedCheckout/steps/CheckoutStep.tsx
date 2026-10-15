import { formatLongDateTime } from "@helpers/formatters";
import { Box, Button, LinearProgress, Stack, Typography } from "@mui/material";
import { TFunction } from "i18next";
import { useAuth } from "react-oidc-context";
import { isReadOnly } from "@helpers/readOnlyAccess";

interface CheckoutStep {
	checkoutCompleted: boolean;
	/** The request went to ERROR: no later poll will turn it into a loan. */
	checkoutFailed: boolean;
	stepError: number | null;
	handleViewRequest: () => void;
	handleReadOnlyReturn: () => void;
	t: TFunction;
	dueDate: string | undefined;
	dueDateUnavailable: boolean;
}
export const CheckoutStep = ({
	checkoutCompleted,
	checkoutFailed,
	stepError,
	handleViewRequest,
	handleReadOnlyReturn,
	t,
	dueDate,
	dueDateUnavailable,
}: CheckoutStep) => {
	const isButtonEnabled = checkoutCompleted || stepError === 2;

	const getProgressColor = (): "success" | "error" | "primary" => {
		if (checkoutCompleted) return "success";
		if (stepError === 2) return "error";
		return "primary";
	};
	const auth = useAuth();
	const readOnly = isReadOnly(auth?.user?.profile?.roles);
	const displayDueDate = dueDate
		? formatLongDateTime(dueDate)
		: dueDateUnavailable
			? t("requesting.expedited_checkout.steps.due_date_unavailable")
			: t("requesting.expedited_checkout.steps.due_date_loading");

	const failureText = checkoutFailed
		? t("requesting.expedited_checkout.steps.checkout_error")
		: readOnly
			? t("requesting.expedited_checkout.steps.checkout_failure_request_only")
			: t("requesting.expedited_checkout.steps.checkout_failure");

	return (
		<Stack direction="column" spacing={2}>
			{/* A live region: the outcome arrives while the user waits on this step. */}
			<Typography id="progress-bar-checkout" role="status">
				{checkoutCompleted &&
					t("requesting.expedited_checkout.steps.checkout_success", {
						dueDate: displayDueDate,
					})}
				{!checkoutCompleted &&
					stepError !== 2 &&
					t("requesting.expedited_checkout.steps.checkout_waiting")}
				{!checkoutCompleted && stepError === 2 && failureText}
			</Typography>

			<LinearProgress
				variant={isButtonEnabled ? "determinate" : "indeterminate"}
				color={getProgressColor()}
				value={checkoutCompleted ? 100 : undefined}
				aria-labelledby="progress-bar-checkout"
				sx={{
					mb: 3,
					mt: 1,
					"& .MuiLinearProgress-bar": {
						backgroundColor: checkoutCompleted
							? "success.main"
							: "primary.main",
					},
				}}
			/>

			<Box
				sx={{
					display: "flex",
					justifyContent: "flex-end",
					width: "100%",
					pt: 2,
				}}>
				{readOnly ? (
					<Button
						variant="contained"
						onClick={handleReadOnlyReturn}
						disabled={!isButtonEnabled}>
						{t("requesting.expedited_checkout.return")}
					</Button>
				) : (
					<Button
						variant="contained"
						onClick={handleViewRequest}
						disabled={!isButtonEnabled}>
						{t("requesting.expedited_checkout.view_request")}
					</Button>
				)}
			</Box>
		</Stack>
	);
};
