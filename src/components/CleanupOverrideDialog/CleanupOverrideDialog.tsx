import {
	Button,
	Checkbox,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	Divider,
	FormControlLabel,
	Stack,
	Typography,
} from "@mui/material";
import { useState } from "react";
import { useTranslation } from "react-i18next";

interface CleanupOverrideDialogProps {
	open: boolean;
	/** How many refused requests would be cleaned up anyway. */
	count: number;
	/** dcb-service's reason for refusing, when there is one request to explain. */
	detail?: string;
	onClose: () => void;
	onConfirm: () => void;
}

/**
 * The second confirmation before cleaning up a request dcb-service refused because its item
 * is out. Confirming sends force=true. docs/cleanup.md.
 */
export const CleanupOverrideDialog = ({
	open,
	count,
	detail,
	onClose,
	onConfirm,
}: CleanupOverrideDialogProps) => {
	const { t } = useTranslation();
	const [acknowledged, setAcknowledged] = useState(false);

	return (
		<Dialog
			open={open}
			onClose={onClose}
			aria-labelledby="cleanup-override-title"
			aria-describedby="cleanup-override-warning"
			fullWidth
			slotProps={{ transition: { onExited: () => setAcknowledged(false) } }}>
			<DialogTitle id="cleanup-override-title" variant="modalTitle">
				{t("patron_request.cleanup_override.title", { count })}
			</DialogTitle>
			<Divider aria-hidden="true" />
			<DialogContent>
				<Stack spacing={2} sx={{ mt: 2 }}>
					<Typography id="cleanup-override-warning" variant="body1">
						{t("patron_request.cleanup_override.warning", { count })}
					</Typography>
					{detail ? (
						<Typography variant="body2">
							{t("patron_request.cleanup_override.reason", { detail })}
						</Typography>
					) : null}
					<FormControlLabel
						control={
							<Checkbox
								checked={acknowledged}
								onChange={(event) => setAcknowledged(event.target.checked)}
							/>
						}
						label={t("patron_request.cleanup_override.acknowledge", { count })}
					/>
				</Stack>
				<DialogActions>
					<Button onClick={onClose} variant="outlined" color="primary">
						{t("ui.actions.cancel")}
					</Button>
					<div style={{ flex: "1 0 0" }} />
					<Button
						onClick={onConfirm}
						disabled={!acknowledged}
						color="error"
						variant="contained">
						{t("patron_request.cleanup_override.confirm")}
					</Button>
				</DialogActions>
			</DialogContent>
		</Dialog>
	);
};
