import { GridFilterInputValueProps } from "@mui/x-data-grid-premium";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs, { Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";
import { useTranslation } from "react-i18next";
import { MultiInputDateTimeRangeField } from "@mui/x-date-pickers-pro/MultiInputDateTimeRangeField";
import { DateTimeRangePicker } from "@mui/x-date-pickers-pro/DateTimeRangePicker";
import { useClock } from "@/hooks/useThemeStore";

// The pickers need it to show and take a value in UTC.
dayjs.extend(utc);

export default function DateTimeRangeFilter(props: GridFilterInputValueProps) {
	const { item, applyValue, focusElementRef } = props;
	const { t } = useTranslation();
	const clock = useClock();

	const [rawStart, rawEnd] = Array.isArray(item.value)
		? item.value
		: [null, null];
	const startDate = rawStart ? dayjs(rawStart) : null;
	const endDate = rawEnd ? dayjs(rawEnd) : null;

	const handleChange = (newValue: [Dayjs | null, Dayjs | null]) => {
		// Both ends cleared is no filter: MUI counts any array as an applied one
		applyValue({ ...item, value: newValue.some(Boolean) ? newValue : undefined });
	};

	return (
		<LocalizationProvider dateAdapter={AdapterDayjs}>
			<DateTimeRangePicker
				value={[startDate, endDate]}
				onChange={handleChange}
				inputRef={focusElementRef}
				timezone={clock === "service" ? "UTC" : "system"}
				slots={{ field: MultiInputDateTimeRangeField }}
				localeText={{
					start: t("ui.data_grid.filters.from"),
					end: t("ui.data_grid.filters.to"),
				}}
				slotProps={{
					textField: {
						size: "small",
					},
					actionBar: { actions: ["clear", "nextOrAccept"] },
				}}
			/>
		</LocalizationProvider>
	);
}
