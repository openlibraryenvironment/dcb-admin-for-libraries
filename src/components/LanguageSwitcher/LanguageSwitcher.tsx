import { useTranslation } from "react-i18next";
import { MenuItem, Select, SelectChangeEvent } from "@mui/material";

const LanguageSwitcher = () => {
	const { i18n, t } = useTranslation();

	const changeLanguage = (event: SelectChangeEvent) => {
		i18n.changeLanguage(event.target.value);
	};

	return (
		<Select value={i18n.language} onChange={changeLanguage} variant="outlined">
			<MenuItem value="en">{t("settings.language.en")}</MenuItem>
			<MenuItem value="es">{t("settings.language.es")}</MenuItem>
		</Select>
	);
};

export default LanguageSwitcher;
