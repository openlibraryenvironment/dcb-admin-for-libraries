import { create } from "zustand";
import { persist } from "zustand/middleware";

import { storageKey } from "@helpers/appBase";
import {
	deploymentLocale,
	isLanguageChoice,
	resolveLocale,
	type AppLocale,
	type LanguageChoice,
} from "@helpers/locale";

interface LocalePreference {
	/** Per user and stored on this device, like the display preferences beside it. */
	choice: LanguageChoice;
	setChoice: (choice: LanguageChoice) => void;
}

export const useLocaleStore = create<LocalePreference>()(
	persist(
		(set) => ({
			choice: "deployment",
			setChoice: (choice) =>
				set({ choice: isLanguageChoice(choice) ? choice : "deployment" }),
		}),
		{
			name: storageKey("dcb-admin-libraries-locale"),
			// Validated on the way out of storage too: a value written by another
			// build never passes through setChoice.
			merge: (persisted, current) => {
				const stored = (persisted ?? {}) as Partial<LocalePreference>;
				return {
					...current,
					choice: isLanguageChoice(stored.choice)
						? stored.choice
						: "deployment",
				};
			},
		},
	),
);

/** The locale in force, for code that is not a component. */
export const currentLocale = (): AppLocale =>
	resolveLocale(useLocaleStore.getState().choice, deploymentLocale());

/** The locale in force, for components. */
export const useAppLocale = (): AppLocale =>
	resolveLocale(
		useLocaleStore((state) => state.choice),
		deploymentLocale(),
	);
