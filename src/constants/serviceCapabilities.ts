/**
 * Which features need which dcb-service release — R-19.
 *
 * <h2>The problem this exists to solve, once</h2>
 *
 * This application ships on its own cadence and a dcb-service upgrade takes time to reach
 * production, so a release of this app has to run against more than one release of the
 * backend. The naive way to handle that — hide the component — does not work for GraphQL:
 *
 *   **A field the server does not declare is not a null. It is a validation error, and it
 *   fails the WHOLE operation.**
 *
 * `LoadLibrary` is fetched by the header on every page and by six routes. Three fields
 * selected one release too early therefore do not grey out a form; they take the
 * application down. So a version gate has to change the DOCUMENT and the mutation
 * VARIABLES before they are sent, and it has to do it somewhere a person adding the next
 * feature cannot forget.
 *
 * <h2>How to add the next one</h2>
 *
 * This registry is that place. To gate a feature on a dcb-service release:
 *
 *  1. Add a row below: an id, a `VITE_FEATURE_*` flag, the release it lands in, and the
 *     fields it adds keyed by the GraphQL type — INPUT types included, because stripping
 *     a key from mutation variables is a separate job from leaving it out of a selection.
 *  2. Declare the flag in `@helpers/featureFlags` and add it to
 *     `docker/production/inject_env.json.template`. `featureFlags.test.ts` fails if you
 *     forget the second.
 *  3. Interpolate `capabilitySelection(id, "TypeName")` into the documents instead of
 *     listing the fields, and pass mutation variables through `stripUnsupportedInput`.
 *  4. Commit the schema of the release named in `since`, as `schema.v<version>.graphqls`.
 *
 * `serviceCapabilities.test.ts` then checks the row is TRUE: every field must exist in the
 * schema for `since` and must be absent from the release before it. A row claiming the
 * wrong release fails the build rather than an environment.
 *
 * `schemaConformance.test.ts` checks the documents: every one of them, in both flag
 * states, against the schema for the deployment that state describes.
 *
 * <h2>Why one flag per capability and not one "we are on v9 now"</h2>
 *
 * Read the `since` column. They differ, and they will keep differing: features land in
 * whatever release they land in, and this app's releases do not line up with dcb-service's.
 * A single boolean would be a lie about every capability but one.
 */

/** A GraphQL type name to the fields a capability adds to it. */
export type CapabilityFields = Readonly<Record<string, readonly string[]>>;

export interface ServiceCapability {
	/** Stable id; also the i18n key suffix under `service_capabilities.`. */
	id: string;
	/** The environment variable an operator sets. */
	flag: string;
	/**
	 * The lowest dcb-service that serves it, inclusive, or null when no release does
	 * yet. A null row is switchable for a development deployment tracking main, and is
	 * reported as "not in any release" rather than as available.
	 */
	since: string | null;
	/**
	 * The fields this capability adds, by GraphQL type. Object types drive
	 * capabilitySelection; input types drive stripUnsupportedInput. Both are checked
	 * against the committed schemas.
	 */
	fields: CapabilityFields;
	/**
	 * What to select instead on an older deployment, by type. Only for a capability
	 * that RENAMED something: the consortium brand in dcb-admin-ui replaced two columns
	 * that still exist under their old names before the migration, and selecting nothing
	 * there would visibly remove branding a deployment already shows.
	 *
	 * Absent means there is no older equivalent, which is the ordinary case: the field
	 * is simply new.
	 */
	fallback?: CapabilityFields;
}

export const SERVICE_CAPABILITIES: readonly ServiceCapability[] = [
	{
		// The patron-facing brand a library sets for the discovery app. New in 9.0.0 -
		// Library had no brand at all before it, so there is nothing to fall back to.
		id: "library_branding",
		flag: "VITE_FEATURE_LIBRARY_BRANDING",
		since: "9.0.0",
		fields: {
			Library: ["brandLogoUrl", "brandLogoAlt", "defaultThemeName"],
			UpdateLibraryInput: [
				"brandLogoUrl",
				"brandLogoAlt",
				"defaultThemeName",
			],
		},
	},
	{
		// REST, not GraphQL: the /insights endpoints. No fields, so nothing to select or
		// strip - it is here because an operator setting flags needs one list, not two.
		id: "insights",
		flag: "VITE_FEATURE_INSIGHTS",
		since: "9.0.0",
		fields: {},
	},
];

const byId = new Map(SERVICE_CAPABILITIES.map((entry) => [entry.id, entry]));

export const capability = (id: string): ServiceCapability => {
	const found = byId.get(id);
	if (!found) {
		throw new Error(`Unknown service capability: ${id}`);
	}
	return found;
};

/**
 * The leading numeric triplet of a version string, or null when there is not one.
 *
 * Tolerant on purpose. `/info` answers "9.0.0", but also "9.1.0-SNAPSHOT" from a
 * development build and whatever a branch build cares to report. Anything this cannot
 * read confidently becomes null, and null is reported as "cannot tell" rather than
 * guessed — a wrong version comparison shown next to a flag is worse than none, because
 * somebody would act on it.
 */
export const parseServiceVersion = (
	version: string | null | undefined,
): [number, number, number] | null => {
	const match = /^\s*v?(\d+)\.(\d+)\.(\d+)/.exec(version ?? "");
	return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
};

/**
 * Whether `version` is at least `minimum`. Null when either cannot be read; false when
 * `minimum` is null, because a capability no release serves is not served by any version.
 *
 * Component-wise, not lexical: "8.71.0" sorts above "8.9.0" as a string.
 */
export const meetsServiceVersion = (
	version: string | null | undefined,
	minimum: string | null,
): boolean | null => {
	if (minimum === null) return false;

	const actual = parseServiceVersion(version);
	const wanted = parseServiceVersion(minimum);
	if (!actual || !wanted) return null;

	for (let i = 0; i < 3; i++) {
		if (actual[i] !== wanted[i]) return actual[i] > wanted[i];
	}
	return true;
};
