import { FunctionalSetting } from "./FunctionalSetting";

export interface PatronRequestAutocompleteOption {
	agencyName?: string;
	label: string;
	value: string;
	agencyId?: string;
	functionalSettings?: FunctionalSetting[];
	hostLmsCode?: string;
	dueDate?: string;
	agencyCode?: string;
}
