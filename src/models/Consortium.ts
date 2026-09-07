import { FunctionalSetting } from "./FunctionalSetting";
import { Group } from "./Group";
import { Person } from "./Person";

export interface Consortium {
	id: string;
	name: string;
	libraryGroup: Group;
	dateOfLaunch: string;
	// The brand marks are deliberately absent. dcb-service V9_0_004 merged
	// headerImageUrl into brandHeaderIconUrl and aboutImageUrl into brandLogoUrl, and
	// dropped the uploader name and email columns that sat beside them - a member of
	// staff's personal data on a type any authenticated principal could read.
	//
	// This app never asked for any of them: it selects `consortium { id name
	// functionalSettings }` and nothing more. They were declared here and never used.
	// Add a brand field to this interface when a query in this app actually requests it.
	description: string;
	catalogueSearchUrl: string;
	websiteUrl: string;
	displayName: string;
	contacts: [Person];
	functionalSettings: [FunctionalSetting];
}
