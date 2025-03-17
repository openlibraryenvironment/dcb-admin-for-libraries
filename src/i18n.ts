import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// Import translations
import en from "./locales/en/en.json";
import es from "./locales/es/es.json";

i18n.use(initReactI18next).init({
	resources: {
		en: { translation: en },
		es: { translation: es },
	},
	lng: "en", // Default language
	fallbackLng: "en",
	interpolation: {
		escapeValue: false, // React already does escaping
	},
});

export default i18n;
