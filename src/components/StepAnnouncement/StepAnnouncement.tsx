import Box from "@mui/material/Box";
import { visuallyHidden } from "@mui/utils";
import { useTranslation } from "react-i18next";

/**
 * Says which step a multi-step form is on. The stepper only restyles its labels,
 * which a screen reader is not told about. WCAG 4.1.3.
 *
 * A live region of the form's own, not the app's Announcer: these forms open in a
 * Dialog, and MUI marks #root - where the Announcer lives - aria-hidden while one
 * is open. Mounted with the form, so it is watched before its text changes.
 */
export default function StepAnnouncement({
	activeStep,
	steps,
}: {
	activeStep: number;
	steps: string[];
}) {
	const { t } = useTranslation();
	const label = steps[activeStep];

	return (
		<Box role="status" aria-live="polite" aria-atomic="true" sx={visuallyHidden}>
			{label
				? t("requesting.steps.announce", {
						number: activeStep + 1,
						total: steps.length,
						label,
					})
				: null}
		</Box>
	);
}
