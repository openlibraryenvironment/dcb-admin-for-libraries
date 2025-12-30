import { GridFilterInputValueProps } from "@mui/x-data-grid-premium";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs, { Dayjs } from "dayjs";
import { useTranslation } from "react-i18next";
import { MultiInputDateTimeRangeField } from "@mui/x-date-pickers-pro/MultiInputDateTimeRangeField";
import { DateTimeRangePicker } from "@mui/x-date-pickers-pro/DateTimeRangePicker";

// For date time ranges
export default function DateTimeRangeFilter(props: GridFilterInputValueProps) {
	const { item, applyValue, focusElementRef } = props;
	const { t } = useTranslation();

	const [rawStart, rawEnd] = Array.isArray(item.value)
		? item.value
		: [null, null];
	const startDate = rawStart ? dayjs(rawStart) : null;
	const endDate = rawEnd ? dayjs(rawEnd) : null;

	const handleChange = (newValue: [Dayjs | null, Dayjs | null]) => {
		applyValue({ ...item, value: newValue });
	};

	// See if we can lift the provider up to app.tsx

	return (
		<LocalizationProvider dateAdapter={AdapterDayjs}>
			<DateTimeRangePicker
				value={[startDate, endDate]}
				onChange={handleChange}
				inputRef={focusElementRef}
				slots={{ field: MultiInputDateTimeRangeField }}
				localeText={{
					start: t("ui.data_grid.filters.from"),
					end: t("ui.data_grid.filters.to"),
				}}
				slotProps={{
					textField: {
						size: "small",
						// variant: "standard",
						// helperText: t("ui.data_grid.filters.local_time"),
					},
					actionBar: { actions: ["clear", "nextOrAccept"] }, // can we add custom actions?
					// today applies to both - maybe it's better to keep it separate?
				}}
			/>
		</LocalizationProvider>
	);
}
