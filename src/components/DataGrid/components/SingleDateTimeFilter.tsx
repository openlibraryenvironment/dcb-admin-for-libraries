import { GridFilterInputValueProps } from "@mui/x-data-grid-premium";
import { DateTimePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs, { Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";
import { useClock } from "@/hooks/useThemeStore";

// The pickers need it to show and take a value in UTC.
dayjs.extend(utc);

// For the "on or after" and "on or before" filters where a single value is the only one required.
export default function SingleDateTimeFilter(props: GridFilterInputValueProps) {
	const { item, applyValue, focusElementRef } = props;
	const clock = useClock();

	const value = item.value ? dayjs(item.value) : null;

	const handleChange = (newValue: Dayjs | null) => {
		applyValue({ ...item, value: newValue });
	};

	return (
		<LocalizationProvider dateAdapter={AdapterDayjs}>
			<DateTimePicker
				value={value}
				onChange={handleChange}
				inputRef={focusElementRef}
				timezone={clock === "service" ? "UTC" : "system"}
				slotProps={{
					textField: {
						size: "small",
						variant: "standard",
					},
					actionBar: { actions: ["clear", "today"] },
				}}
			/>
		</LocalizationProvider>
	);
}
