import {
	FormControl,
	FormControlLabel,
	FormLabel,
	Radio,
	RadioGroup,
	Typography,
	useColorScheme,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/settings")({
	component: RouteComponent,
});

function RouteComponent() {
	const { t } = useTranslation();
	const { mode, setMode } = useColorScheme();
	if (!mode) {
		return null;
	}

	console.log(mode);
	return (
		<Grid
			container
			spacing={{ xs: 2, md: 3 }}
			columns={{ xs: 4, sm: 8, md: 12 }}>
			<Grid size={{ xs: 4, sm: 8, md: 12 }}>
				<Typography>{t("settings.library")}</Typography>
			</Grid>
			<Grid size={{ xs: 4, sm: 8, md: 12 }}>
				<Typography>{t("settings.customisation")}</Typography>
			</Grid>
			<Grid size={{ xs: 4, sm: 8, md: 12 }}>
				<FormControl>
					<FormLabel id="theme-toggle">
						{t("settings.theme_selection")}
					</FormLabel>
					<RadioGroup
						aria-labelledby="demo-theme-toggle"
						name="theme-toggle"
						row
						value={mode}
						onChange={(event) =>
							setMode(event.target.value as "system" | "light" | "dark")
						}>
						<FormControlLabel
							value="system"
							control={<Radio />}
							label={t("settings.system_mode")}
						/>
						<FormControlLabel
							value="light"
							control={<Radio />}
							label={t("settings.light_mode")}
						/>
						<FormControlLabel
							value="dark"
							control={<Radio />}
							label={t("settings.dark_mode")}
						/>
					</RadioGroup>
				</FormControl>
			</Grid>
		</Grid>
	);
}
