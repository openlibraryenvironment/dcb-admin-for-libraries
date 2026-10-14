import { useId } from "react";
import { useTranslation } from "react-i18next";
import { Stack, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";

import { WINDOW_DAYS, type HomeWindowKind } from "@helpers/home";

/** Which window the problems and activity are counted over. */
export default function WindowChoice({
	value,
	onChange,
	offerVisit,
	visitKnown,
}: {
	value: HomeWindowKind;
	onChange: (value: HomeWindowKind) => void;
	offerVisit: boolean;
	/** False when this browser holds no earlier visit, so the option has nothing to count from. */
	visitKnown: boolean;
}) {
	const { t } = useTranslation();
	const noteId = useId();
	const noVisit = offerVisit && !visitKnown;

	return (
		<Stack spacing={0.5}>
			<ToggleButtonGroup
				size="small"
				exclusive
				value={value}
				onChange={(_event, next: HomeWindowKind | null) => next && onChange(next)}
				aria-label={t("home.window.label")}
				aria-describedby={noVisit ? noteId : undefined}
				sx={{ flexWrap: "wrap" }}
			>
				<ToggleButton value="today">{t("home.window.today")}</ToggleButton>
				<ToggleButton value="week">
					{t("home.window.days", { count: WINDOW_DAYS.week })}
				</ToggleButton>
				<ToggleButton value="month">
					{t("home.window.days", { count: WINDOW_DAYS.month })}
				</ToggleButton>
				{offerVisit ? (
					<ToggleButton value="visit" disabled={!visitKnown}>
						{t("home.window.visit")}
					</ToggleButton>
				) : null}
			</ToggleButtonGroup>
			{noVisit ? (
				<Typography id={noteId} variant="body2" color="text.secondary">
					{t("home.window.no_visit")}
				</Typography>
			) : null}
		</Stack>
	);
}
