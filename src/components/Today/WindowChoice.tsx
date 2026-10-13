import { useId } from "react";
import { useTranslation } from "react-i18next";
import { Stack, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";

import { TODAY_WINDOW_HOURS, type TodayWindowKind } from "@helpers/today";

/** Which window the problems and activity are counted over. */
export default function WindowChoice({
	value,
	onChange,
	visitKnown,
}: {
	value: TodayWindowKind;
	onChange: (value: TodayWindowKind) => void;
	/** False when this browser holds no earlier visit, so the option has nothing to count from. */
	visitKnown: boolean;
}) {
	const { t } = useTranslation();
	const noteId = useId();

	return (
		<Stack spacing={0.5}>
			<ToggleButtonGroup
				size="small"
				exclusive
				value={value}
				onChange={(_event, next: TodayWindowKind | null) => next && onChange(next)}
				aria-label={t("today.window.label")}
				aria-describedby={visitKnown ? undefined : noteId}
			>
				<ToggleButton value="day">
					{t("today.window.day", { count: TODAY_WINDOW_HOURS })}
				</ToggleButton>
				<ToggleButton value="visit" disabled={!visitKnown}>
					{t("today.window.visit")}
				</ToggleButton>
			</ToggleButtonGroup>
			{visitKnown ? null : (
				<Typography id={noteId} variant="body2" color="text.secondary">
					{t("today.window.no_visit")}
				</Typography>
			)}
		</Stack>
	);
}
