import {
	Box,
	Button,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	LinearProgress,
	Typography,
} from "@mui/material";
import { useId } from "react";
import { useTranslation } from "react-i18next";

interface ExportProgressProps {
	open: boolean;
	progress: number;
	totalRecords: number;
	onCancel: () => void;
}

export const ExportProgressDialog = ({
	open,
	progress,
	totalRecords,
	onCancel,
}: ExportProgressProps) => {
	const { t } = useTranslation();
	const titleId = useId();
	// Announced in tens: a polite region read at every percent would talk over the reader.
	const announced = Math.floor(progress / 10) * 10;

	return (
		<Dialog open={open} fullWidth aria-labelledby={titleId} onClose={onCancel}>
			<DialogTitle id={titleId} variant="modalTitle">
				{t("ui.data_grid.export.modal_title")}
			</DialogTitle>
			<DialogContent>
				<Box sx={{ width: "100%", mb: 2 }}>
					<Typography
						variant="body1"
						align="center"
						role="status"
						sx={{ color: "text.secondary" }}>
						{t("ui.data_grid.export.complete", { percentage: announced + "%" })}
					</Typography>
					<LinearProgress
						variant="determinate"
						value={progress}
						aria-label={t("ui.data_grid.export.modal_title")}
					/>
				</Box>
				<Typography variant="body1">
					{t("ui.data_grid.export.records", { count: totalRecords })}
				</Typography>
			</DialogContent>
			<DialogActions>
				<Button onClick={onCancel}>{t("ui.data_grid.export.cancel")}</Button>
			</DialogActions>
		</Dialog>
	);
};
