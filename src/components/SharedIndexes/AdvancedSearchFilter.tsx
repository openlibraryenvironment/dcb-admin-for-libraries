import {
	Box,
	TextField,
	Select,
	MenuItem,
	FormControl,
	InputLabel,
	Button,
	IconButton,
	Stack,
	Chip,
	Autocomplete,
	Typography,
} from "@mui/material";
import { Add, Delete } from "@mui/icons-material";
import {
	SearchField,
	BooleanOperator,
	SearchFilter,
} from "@models/SearchTypes";
import { LANGUAGE_CODES } from "@constants/search/languageOptions";
import { useTranslation } from "react-i18next";
import { useMemo } from "react";

interface AdvancedSearchFilterProps {
	filters: SearchFilter[];
	onFiltersChange: (filters: SearchFilter[]) => void;
	isAdvancedMode: boolean;
}

export const AdvancedSearchFilter = ({
	filters,
	onFiltersChange,
	isAdvancedMode,
}: AdvancedSearchFilterProps) => {
	const { t } = useTranslation();

	const searchFieldOptions = useMemo(
		() => [
			{ value: SearchField.Keyword, label: t("requesting.shared_index.search_fields.keyword") },
			{ value: SearchField.Title, label: t("requesting.shared_index.search_fields.title") },
			{ value: SearchField.Author, label: t("requesting.shared_index.search_fields.author") },
			{ value: SearchField.ISSN, label: t("requesting.shared_index.search_fields.issn") },
			{ value: SearchField.ISBN, label: t("requesting.shared_index.search_fields.isbn") },
			{ value: SearchField.Subject, label: t("requesting.shared_index.search_fields.subject") },
			{ value: SearchField.Language, label: t("requesting.shared_index.search_fields.language") },
			{ value: SearchField.Publisher, label: t("requesting.shared_index.search_fields.publisher") },
			{ value: SearchField.Format, label: t("requesting.shared_index.search_fields.format") },
			{
				value: SearchField.ClusterRecordID,
				label: t("requesting.shared_index.search_fields.cluster_record_id"),
			},
		],
		[t],
	);

	const booleanOperatorOptions = useMemo(
		() => [
			{ value: BooleanOperator.AND, label: t("requesting.shared_index.boolean.and") },
			{ value: BooleanOperator.OR, label: t("requesting.shared_index.boolean.or") },
			{ value: BooleanOperator.NOT, label: t("requesting.shared_index.boolean.not") },
		],
		[t],
	);

	// Codes are constant; the names follow the user's language.
	const languageOptions = useMemo(
		() =>
			LANGUAGE_CODES.map((value) => ({
				value,
				label: t(`requesting.shared_index.languages.${value}`),
			})),
		[t],
	);

	const numberOfActiveFilters =
		filters?.filter((f) => f?.value?.trim()).length ?? 0;

	const addFilter = () => {
		const newFilter: SearchFilter = {
			id: Date.now().toString(),
			field: SearchField.Title,
			value: "",
			operator: BooleanOperator.AND,
		};
		onFiltersChange([...filters, newFilter]);
	};

	const removeFilter = (id: string) => {
		if (filters.length > 1) {
			onFiltersChange(filters.filter((f) => f.id !== id));
		}
	};

	const updateFilter = (id: string, updates: Partial<SearchFilter>) => {
		onFiltersChange(
			filters.map((f) => (f.id === id ? { ...f, ...updates } : f)),
		);
	};

	const clearAllFilters = () => {
		onFiltersChange([
			{
				id: Date.now().toString(),
				field: SearchField.Title,
				value: "",
			},
		]);
	};

	const renderValueInput = (filter: SearchFilter) => {
		if (filter.field === SearchField.Language) {
			return (
				<Autocomplete
					value={
						languageOptions.find((opt) => opt.value === filter.value) || null
					}
					onChange={(_, newValue) => {
						updateFilter(filter.id, { value: newValue?.value || "" });
					}}
					options={languageOptions}
					getOptionLabel={(option) => option.label}
					renderInput={(params) => (
						<TextField
							{...params}
							label={t("ui.common.language")}
							variant="outlined"
							size="small"
						/>
					)}
					sx={{ minWidth: 200, flexGrow: 1 }}
				/>
			);
		}

		return (
			<TextField
				value={filter.value}
				onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
				label={t("ui.common.search_term")}
				variant="outlined"
				size="small"
				sx={{ minWidth: 200, flexGrow: 1 }}
			/>
		);
	};

	// Determine which filters to render based on the mode
	const filtersToRender = isAdvancedMode ? filters : filters.slice(0, 1);

	//fix this styling
	return (
        <Box sx={{ p: 2, border: 1, borderColor: "divider", borderRadius: 1 }}>
            <Stack spacing={2}>
				{filtersToRender.map((filter, index) => (
					<Stack
						key={filter.id}
						direction="row"
						spacing={2}
						sx={{
                            alignItems: "center"
                        }}>
						{/* Only show boolean operator in advanced mode for subsequent filters */}
						{isAdvancedMode && index > 0 && (
							<FormControl size="small" sx={{ minWidth: 80 }}>
								<InputLabel>{t("ui.common.operator")}</InputLabel>
								<Select
									value={filter.operator || BooleanOperator.AND}
									onChange={(e) =>
										updateFilter(filter.id, {
											operator: e.target.value as BooleanOperator,
										})
									}
									label={t("ui.common.operator")}>
									{booleanOperatorOptions.map((op) => (
										<MenuItem key={op.value} value={op.value}>
											{op.label}
										</MenuItem>
									))}
								</Select>
							</FormControl>
						)}

						<FormControl size="small" sx={{ minWidth: 150 }}>
							<InputLabel>{t("ui.common.field")}</InputLabel>
							<Select
								value={filter.field}
								onChange={(e) =>
									updateFilter(filter.id, {
										field: e.target.value as SearchField,
										value: "", // Reset value when field changes
									})
								}
								label={t("ui.common.field")}>
								{searchFieldOptions.map((field) => (
									<MenuItem key={field.value} value={field.value}>
										{field.label}
									</MenuItem>
								))}
							</Select>
						</FormControl>

						{renderValueInput(filter)}

						{/* Only show delete button in advanced mode */}
						{isAdvancedMode && (
							<IconButton
								onClick={() => removeFilter(filter.id)}
								disabled={filters.length === 1}
								color="error">
								<Delete />
							</IconButton>
						)}
					</Stack>
				))}

				{/* Only show action buttons in advanced mode */}
				{isAdvancedMode && (
					<Stack direction="row" spacing={2}>
						<Button
							startIcon={<Add />}
							onClick={addFilter}
							variant="outlined"
							size="small">
							{t("ui.actions.add_filter")}
						</Button>
						<Button
							onClick={clearAllFilters}
							variant="outlined"
							color="secondary"
							size="small"
							disabled={numberOfActiveFilters === 0}>
							{t("ui.actions.clear_all")}
						</Button>
					</Stack>
				)}

				{/* Only show active filter chips in advanced mode */}
				{isAdvancedMode && filters.some((f) => f.value) && (
					<Box>
						<Typography variant="hitCount">
							{t("ui.data_grid.active_filters", {
								number: numberOfActiveFilters,
							})}
						</Typography>
						<Stack
                            direction="row"
                            spacing={1}
                            sx={{
                                flexWrap: "wrap",
                                mt: 1
                            }}>
							{filters
								.filter((f) => f.value)
								.map((filter) => (
									<Chip
										key={filter.id}
										label={`${
											searchFieldOptions.find(
												(opt) => opt.value === filter.field,
											)?.label
										}: ${filter.value}`}
										onDelete={() => updateFilter(filter.id, { value: "" })}
										size="small"
									/>
								))}
						</Stack>
					</Box>
				)}
			</Stack>
        </Box>
    );
};
