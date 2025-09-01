import { FunctionalSettingStatus } from "@models/FunctionalSetting";
import { Library } from "@models/Library";

export function isFunctionalSettingEnabled(
	library: Library | undefined,
	settingName: string
): 1 | 0 | -1 {
	// Returns 1 if the setting is enabled.
	// Returns 0 if the setting is disabled.
	// Returns -1 if no setting is present. This allows for custom behaviour when a setting is not present.
	// i.e. if DENY_LIBRARY_MAPPING_EDIT is not present, we fail-safe and assume it is enabled to deny unauthorised edits- different to our normal behaviour

	// No group membership means no consortium link
	if (!library?.membership) {
		return FunctionalSettingStatus.NOT_PRESENT;
	}

	const consortium = library.membership.find(
		(member) => member?.libraryGroup?.type === "CONSORTIUM"
	)?.libraryGroup?.consortium;

	// If no consortium link exists, we can't have any functional settings - so return NOT_PRESENT

	if (!consortium) {
		return FunctionalSettingStatus.NOT_PRESENT;
	}
	// No functional settings present - return NOT_PRESENT
	if (!consortium?.functionalSettings) {
		return FunctionalSettingStatus.NOT_PRESENT;
	}

	const setting = consortium.functionalSettings.find(
		(s) => s.name === settingName
	);

	// If the setting does not exist, return NOT_PRESENT
	if (!setting) {
		return FunctionalSettingStatus.NOT_PRESENT;
	}

	return setting.enabled
		? FunctionalSettingStatus.ENABLED
		: FunctionalSettingStatus.DISABLED;
}
