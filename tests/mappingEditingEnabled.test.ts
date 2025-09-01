import { describe, it, expect } from "vitest";
import { isFunctionalSettingEnabled } from "../src/helpers/findFunctionalSetting";
import { Library } from "../src/models/Library";
import { FunctionalSettingStatus } from "../src/models/FunctionalSetting";

// A test of the find functional settings function
// Does it behave as we expect?

function makeLibraryWithSettings(
	settings: { name: string; enabled: boolean }[]
): Library {
	return {
		id: "1",
		fullName: "Test Library",
		shortName: "TL",
		abbreviatedName: "TL",
		agencyCode: "TL",
		supportHours: "",
		address: "",
		agency: {} as any,
		secondHostLms: {} as any,
		membership: [
			{
				id: "m1",
				library: {} as any,
				libraryGroup: {
					id: "g1",
					code: "c1",
					name: "Consortium Group",
					type: "CONSORTIUM",
					members: [],
					consortium: {
						id: "c1",
						name: "Consortium",
						libraryGroup: {} as any,
						dateOfLaunch: "",
						headerImageUrl: "",
						headerImageUploader: "",
						headerImageUploaderEmail: "",
						aboutImageUrl: "",
						aboutImageUploader: "",
						aboutImageUploaderEmail: "",
						description: "",
						catalogueSearchUrl: "",
						websiteUrl: "",
						displayName: "",
						contacts: [] as any,
						functionalSettings: settings as any,
					},
				},
			},
		],
		type: "PUBLIC",
		latitude: 0,
		longitude: 0,
		patronWebsite: "",
		hostLmsConfiguration: "",
		discoverySystem: "",
		backupDowntimeSchedule: "",
		training: false,
		contacts: [],
		reason: "",
	};
}

function makeLibrariesData(library: Library | undefined) {
	return {
		libraries: {
			content: library ? [library] : [],
		},
	};
}

describe("Tests whether mapping editing is correctly enabled / disabled in a range of scenarios", () => {
	it("Editing should be available when DENY_LIBRARY_MAPPING_EDIT is explicitly disabled", () => {
		const lib = makeLibraryWithSettings([
			{ name: "DENY_LIBRARY_MAPPING_EDIT", enabled: false },
		]);
		const librariesData = makeLibrariesData(lib);

		const library = librariesData.libraries.content[0];
		// Editing should be enabled only if DENY_LIBRARY_MAPPING_EDIT is disabled
		const editingEnabled =
			isFunctionalSettingEnabled(library, "DENY_LIBRARY_MAPPING_EDIT") ==
			FunctionalSettingStatus.DISABLED;

		expect(editingEnabled).toBe(true);
	});

	it("Editing should not be available when DENY_LIBRARY_MAPPING_EDIT is explicitly enabled", () => {
		const lib = makeLibraryWithSettings([
			{ name: "DENY_LIBRARY_MAPPING_EDIT", enabled: true },
		]);
		const librariesData = makeLibrariesData(lib);

		const library = librariesData.libraries.content[0];
		const editingEnabled =
			isFunctionalSettingEnabled(library, "DENY_LIBRARY_MAPPING_EDIT") ==
			FunctionalSettingStatus.DISABLED;

		expect(editingEnabled).toBe(false);
	});

	it("Editing should not be available when DENY_LIBRARY_MAPPING_EDIT is not present", () => {
		const lib = makeLibraryWithSettings([
			{ name: "PICKUP_ANYWHERE", enabled: true },
		]);
		const librariesData = makeLibrariesData(lib);

		const library = librariesData.libraries.content[0];
		const editingEnabled =
			isFunctionalSettingEnabled(library, "DENY_LIBRARY_MAPPING_EDIT") ==
			FunctionalSettingStatus.DISABLED;

		expect(editingEnabled).toBe(false);
	});

	it("Editing should not be available when there is no library data at all", () => {
		const librariesData = makeLibrariesData(undefined);

		const library = librariesData.libraries.content[0]; // undefined
		const editingDisabled =
			isFunctionalSettingEnabled(library, "DENY_LIBRARY_MAPPING_EDIT") !==
			FunctionalSettingStatus.DISABLED;

		expect(editingDisabled).toBe(true);
	});
});
