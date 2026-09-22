import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en/en.json";

// ONE language, deliberately: `es` carried 0.4% of the keys, and i18next
// renders a missing key as the key itself. What a real second language needs,
// and why `lng` is pinned: docs/theming.md §8.
i18n.use(initReactI18next).init({
	resources: {
		en: { translation: en },
	},
	lng: "en",
	fallbackLng: "en",
	interpolation: {
		escapeValue: false, // React already does escaping
	},
});

export default i18n;
