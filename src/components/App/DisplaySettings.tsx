import Button from "@mui/material/Button";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormLabel from "@mui/material/FormLabel";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import RestartAltOutlined from "@mui/icons-material/RestartAltOutlined";
import { useTranslation } from "react-i18next";

import { useAnnounce } from "@/hooks/useAnnouncer";
import { THEME_MODES, useThemeStore } from "@/hooks/useThemeStore";
import { DENSITIES, MOTIONS, TEXT_SIZES } from "@/themes/display";

/**
 * "Match my device" is the ABSENCE of a stored mode, not a fourth mode. The
 * store holds null for it and useResolvedMode turns that into a scheme. A radio
 * group cannot carry null as a value, so it round-trips through this sentinel
 * and nowhere else.
 */
const SYSTEM = "system" as const;
const MODE_CHOICES = [SYSTEM, ...THEME_MODES] as const;

interface ChoiceProps<T extends string> {
	name: string;
	options: readonly T[];
	value: T;
	onChange: (value: T) => void;
}

/**
 * A fieldset and legend by way of FormControl + FormLabel, so a screen reader
 * announces the question before the options and reads "2 of 4" within it.
 *
 * Radio groups throughout rather than toggle buttons: every one of these asks
 * the same kind of question - pick one from a short fixed list - and a toggle
 * group carries its selected state almost entirely by fill colour, which is
 * what makes it fail contrast.
 */
function Choice<T extends string>({
	name,
	options,
	value,
	onChange,
}: ChoiceProps<T>) {
	const { t } = useTranslation();
	const labelId = `display-${name}-label`;

	return (
		<FormControl component="fieldset">
			<FormLabel component="legend" id={labelId}>
				{t(`display.${name}.label`)}
			</FormLabel>
			<RadioGroup
				aria-labelledby={labelId}
				name={name}
				value={value}
				onChange={(event) => onChange(event.target.value as T)}
			>
				{options.map((option) => (
					<FormControlLabel
						key={option}
						value={option}
						control={<Radio />}
						label={t(`display.${name}.${option}`)}
					/>
				))}
			</RadioGroup>
		</FormControl>
	);
}

export const DisplaySettings = () => {
	const { t } = useTranslation();
	const announce = useAnnounce();

	const mode = useThemeStore((state) => state.mode);
	const textSize = useThemeStore((state) => state.textSize);
	const density = useThemeStore((state) => state.density);
	const motion = useThemeStore((state) => state.motion);
	const setMode = useThemeStore((state) => state.setMode);
	const setTextSize = useThemeStore((state) => state.setTextSize);
	const setDensity = useThemeStore((state) => state.setDensity);
	const setMotion = useThemeStore((state) => state.setMotion);
	const resetDisplay = useThemeStore((state) => state.resetDisplay);

	return (
		<Stack spacing={3}>
			<Typography>{t("display.description")}</Typography>

			<Choice
				name="mode"
				options={MODE_CHOICES}
				value={mode ?? SYSTEM}
				onChange={(choice) => setMode(choice === SYSTEM ? null : choice)}
			/>
			<Choice
				name="textSize"
				options={TEXT_SIZES}
				value={textSize}
				onChange={setTextSize}
			/>
			<Choice
				name="density"
				options={DENSITIES}
				value={density}
				onChange={setDensity}
			/>
			<Choice
				name="motion"
				options={MOTIONS}
				value={motion}
				onChange={setMotion}
			/>

			{/*
			 * The way back. Somebody who has made the interface unreadable while
			 * experimenting needs an escape that does not require reading the thing
			 * they have just broken - hence a plainly-labelled button, not an icon.
			 * It leaves the colour scheme alone: losing that too would surprise
			 * somebody who only wanted their text size back.
			 */}
			<Stack direction="row">
				<Button
					variant="outlined"
					startIcon={<RestartAltOutlined />}
					onClick={() => {
						resetDisplay();
						announce(t("display.reset_done"));
					}}
				>
					{t("display.reset")}
				</Button>
			</Stack>
		</Stack>
	);
};
