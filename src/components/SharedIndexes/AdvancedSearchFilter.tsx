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
import { LANGUAGE_OPTIONS } from "@constants/search/languageOptions";
import { t } from "i18next";

// Takes the filters array directly and a function to change it.
interface AdvancedSearchFilterProps {
	filters: SearchFilter[];
	onFiltersChange: (filters: SearchFilter[]) => void;
}

export const AdvancedSearchFilter: React.FC<AdvancedSearchFilterProps> = ({
	filters,
	onFiltersChange,
}) => {
	// Our search options and boolean operators.
	const searchFieldOptions = [
		{ value: SearchField.Keyword, label: "Keyword" },
		{ value: SearchField.Title, label: "Title" },
		{ value: SearchField.Author, label: "Author" },
		{ value: SearchField.ISSN, label: "ISSN" },
		{ value: SearchField.ISBN, label: "ISBN" },
		{ value: SearchField.Subject, label: "Subject" },
		{ value: SearchField.Language, label: "Language" },
		{ value: SearchField.Publisher, label: "Publisher" },
		{ value: SearchField.Format, label: "Format" },
		{ value: SearchField.PublicationYear, label: "Publication Year" },
		{ value: SearchField.Library, label: "Library" },
	];

	const booleanOperatorOptions = [
		{ value: BooleanOperator.AND, label: "AND" },
		{ value: BooleanOperator.OR, label: "OR" },
		{ value: BooleanOperator.NOT, label: "NOT" },
	];

	const numberOfActiveFilters =
		filters?.filter((f) => f?.value?.trim()).length ?? 0;

	const addFilter = () => {
		const newFilter: SearchFilter = {
			id: Date.now().toString(),
			field: SearchField.Title,
			value: "",
			operator: BooleanOperator.AND,
		};
		// Directly call the parent's update function with the new array.
		onFiltersChange([...filters, newFilter]);
	};

	const removeFilter = (id: string) => {
		if (filters.length > 1) {
			onFiltersChange(filters.filter((f) => f.id !== id));
		}
	};

	const updateFilter = (id: string, updates: Partial<SearchFilter>) => {
		onFiltersChange(
			filters.map((f) => (f.id === id ? { ...f, ...updates } : f))
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
						LANGUAGE_OPTIONS.find((opt) => opt.label === filter.value) || null
					}
					onChange={(_, newValue) => {
						updateFilter(filter.id, { value: newValue?.label || "" });
					}}
					options={LANGUAGE_OPTIONS}
					getOptionLabel={(option) => option.label}
					renderInput={(params) => (
						<TextField
							{...params}
							label="Language"
							variant="outlined"
							size="small"
						/>
					)}
					sx={{ minWidth: 200 }}
				/>
			);
		}

		return (
			<TextField
				value={filter.value}
				onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
				label="Search term"
				variant="outlined"
				size="small"
				sx={{ minWidth: 200 }}
			/>
		);
	};

	return (
		<Box sx={{ p: 2, border: "1px solid #e0e0e0", borderRadius: 1, mb: 2 }}>
			<Stack spacing={2}>
				{filters.map((filter, index) => (
					<Stack
						key={filter.id}
						direction="row"
						spacing={2}
						alignItems="center">
						{index > 0 && (
							<FormControl size="small" sx={{ minWidth: 80 }}>
								<InputLabel>Operator</InputLabel>
								<Select
									value={filter.operator || BooleanOperator.AND}
									onChange={(e) =>
										updateFilter(filter.id, {
											operator: e.target.value as BooleanOperator,
										})
									}
									label="Operator">
									{booleanOperatorOptions.map((op) => (
										<MenuItem key={op.value} value={op.value}>
											{op.label}
										</MenuItem>
									))}
								</Select>
							</FormControl>
						)}

						<FormControl size="small" sx={{ minWidth: 150 }}>
							<InputLabel>Field</InputLabel>
							<Select
								value={filter.field}
								onChange={(e) =>
									updateFilter(filter.id, {
										field: e.target.value as SearchField,
										value: "", // Reset value when field changes
									})
								}
								label="Field">
								{searchFieldOptions.map((field) => (
									<MenuItem key={field.value} value={field.value}>
										{field.label}
									</MenuItem>
								))}
							</Select>
						</FormControl>

						{renderValueInput(filter)}

						<IconButton
							onClick={() => removeFilter(filter.id)}
							disabled={filters.length === 1}
							color="error">
							<Delete />
						</IconButton>
					</Stack>
				))}

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
						disabled={numberOfActiveFilters == 0}>
						{t("ui.actions.clear_all")}
					</Button>
				</Stack>

				{filters.some((f) => f.value) && (
					<Box>
						<Typography variant="hitCount">
							{t("ui.data_grid.active_filters", {
								number: numberOfActiveFilters,
							})}
						</Typography>
						<Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap">
							{filters
								.filter((f) => f.value)
								.map((filter) => (
									<Chip
										key={filter.id}
										label={`${
											searchFieldOptions.find(
												(opt) => opt.value === filter.field
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
