import { useId, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
	Box,
	Button,
	Checkbox,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	FormControl,
	FormControlLabel,
	FormHelperText,
	FormLabel,
	Radio,
	RadioGroup,
	Stack,
	TextField,
} from "@mui/material";
import {
	type ExportColumn,
	type ExportFormat,
	type ExportScope,
	type FileExportOptions,
	exportFileNameError,
} from "@helpers/dataGrid/exportOptions";

interface ExportWizardProps {
	open: boolean;
	onClose: () => void;
	/** After the closing transition, when focus can safely go back to the trigger. */
	onExited: () => void;
	columns: ExportColumn[];
	/** Checked when the wizard opens. */
	initiallySelected: ReadonlySet<string>;
	defaultFileName: string;
	hasFilters: boolean;
	/** A sentence describing the filters, shown under the filtered scope. */
	filterSummary: string;
	selectedCount: number;
	onExport: (options: FileExportOptions) => void;
}

// File-format names are not translated.
const FORMATS: { value: ExportFormat; label: string }[] = [
	{ value: "csv", label: "CSV" },
	{ value: "tsv", label: "TSV" },
	{ value: "xlsx", label: "Excel (.xlsx)" },
];

export default function ExportWizard({
	open,
	onClose,
	onExited,
	columns,
	initiallySelected,
	defaultFileName,
	hasFilters,
	filterSummary,
	selectedCount,
	onExport,
}: ExportWizardProps) {
	const { t } = useTranslation();
	const ids = {
		title: useId(),
		columns: useId(),
		columnsError: useId(),
		scope: useId(),
		filterSummary: useId(),
		selectedReason: useId(),
		format: useId(),
	};

	const [selected, setSelected] = useState<Set<string>>(() => new Set(initiallySelected));
	const [scope, setScope] = useState<ExportScope>(hasFilters ? "filtered" : "all");
	const [format, setFormat] = useState<ExportFormat>("csv");
	const [fileName, setFileName] = useState(defaultFileName);
	const [submitted, setSubmitted] = useState(false);

	const noColumns = selected.size === 0;
	const fileNameError = useMemo(() => exportFileNameError(fileName), [fileName]);
	const showFileNameError = !!fileNameError && (submitted || fileName !== defaultFileName);

	const toggle = (field: string) =>
		setSelected((previous) => {
			const next = new Set(previous);
			if (!next.delete(field)) next.add(field);
			return next;
		});

	const fileNameRef = useRef<HTMLInputElement>(null);

	const handleExport = () => {
		setSubmitted(true);
		if (noColumns) return;
		if (fileNameError) {
			// The field's error is its description, so moving there reads it out
			fileNameRef.current?.focus();
			return;
		}
		onExport({
			scope,
			format,
			columns: columns.filter((column) => selected.has(column.field)),
			fileName,
		});
		onClose();
	};

	return (
		<Dialog
			open={open}
			onClose={onClose}
			fullWidth
			maxWidth="sm"
			aria-labelledby={ids.title}
			slotProps={{ transition: { onExited } }}>
			<DialogTitle id={ids.title} variant="modalTitle">
				{t("ui.data_grid.export.wizard_title")}
			</DialogTitle>
			<DialogContent dividers>
				<FormControl
					component="fieldset"
					error={noColumns}
					aria-describedby={noColumns ? ids.columnsError : undefined}
					sx={{ width: "100%" }}>
					<FormLabel component="legend" id={ids.columns}>
						{t("ui.data_grid.export.columns")}
					</FormLabel>
					<Stack direction="row" spacing={1}>
						<Button
							size="small"
							disabled={selected.size === columns.length}
							onClick={() => setSelected(new Set(columns.map((column) => column.field)))}>
							{t("ui.data_grid.export.select_all")}
						</Button>
						<Button
							size="small"
							disabled={noColumns}
							onClick={() => setSelected(new Set())}>
							{t("ui.data_grid.export.clear_all")}
						</Button>
					</Stack>
					<Box
						sx={{
							maxHeight: (theme) => theme.spacing(32),
							overflowY: "auto",
							display: "grid",
							gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
							mt: 1,
						}}>
						{columns.map((column) => (
							<FormControlLabel
								key={column.field}
								control={
									<Checkbox
										checked={selected.has(column.field)}
										onChange={() => toggle(column.field)}
									/>
								}
								label={column.headerName}
							/>
						))}
					</Box>
					{noColumns && (
						<FormHelperText id={ids.columnsError} role="alert">
							{t("ui.data_grid.export.no_columns")}
						</FormHelperText>
					)}
				</FormControl>

				<TextField
					fullWidth
					size="small"
					sx={{ my: 3 }}
					label={t("ui.data_grid.export.file_name")}
					inputRef={fileNameRef}
					value={fileName}
					onChange={(event) => setFileName(event.target.value)}
					error={showFileNameError}
					helperText={
						showFileNameError && fileNameError
							? t(fileNameError)
							: t("ui.data_grid.export.file_name_help")
					}
				/>

				<Stack direction={{ xs: "column", sm: "row" }} spacing={4}>
					<FormControl component="fieldset" sx={{ flex: 1 }}>
						<FormLabel component="legend" id={ids.scope}>
							{t("ui.data_grid.export.scope")}
						</FormLabel>
						<RadioGroup
							aria-labelledby={ids.scope}
							value={scope}
							onChange={(event) => setScope(event.target.value as ExportScope)}>
							<FormControlLabel
								value="filtered"
								control={
									<Radio
										slotProps={{
											input: { "aria-describedby": ids.filterSummary },
										}}
									/>
								}
								label={t("ui.data_grid.export.scope_filtered")}
							/>
							<FormHelperText id={ids.filterSummary} sx={{ mt: 0, ml: 4 }}>
								{filterSummary}
							</FormHelperText>
							<FormControlLabel
								value="all"
								control={<Radio />}
								label={t("ui.data_grid.export.scope_all")}
							/>
							<FormControlLabel
								value="selected"
								disabled={selectedCount === 0}
								control={
									<Radio
										slotProps={{
											input: {
												"aria-describedby":
													selectedCount === 0 ? ids.selectedReason : undefined,
											},
										}}
									/>
								}
								label={t("ui.data_grid.export.scope_selected", {
									count: selectedCount,
								})}
							/>
							{selectedCount === 0 && (
								<FormHelperText id={ids.selectedReason} sx={{ mt: 0, ml: 4 }}>
									{t("ui.data_grid.export.scope_selected_none")}
								</FormHelperText>
							)}
						</RadioGroup>
					</FormControl>

					<FormControl component="fieldset">
						<FormLabel component="legend" id={ids.format}>
							{t("ui.data_grid.export.format")}
						</FormLabel>
						<RadioGroup
							aria-labelledby={ids.format}
							value={format}
							onChange={(event) => setFormat(event.target.value as ExportFormat)}>
							{FORMATS.map((option) => (
								<FormControlLabel
									key={option.value}
									value={option.value}
									control={<Radio />}
									label={option.label}
								/>
							))}
						</RadioGroup>
					</FormControl>
				</Stack>
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose}>{t("ui.actions.cancel")}</Button>
				<Button
					variant="contained"
					onClick={handleExport}
					aria-describedby={noColumns ? ids.columnsError : undefined}>
					{t("ui.data_grid.export.export_button")}
				</Button>
			</DialogActions>
		</Dialog>
	);
}
