/**
 * Which features need which dcb-service release - R-19.
 *
 * A field the server does not declare is NOT a null: it is a validation error
 * that fails the whole operation. So a gate has to change the document and the
 * mutation variables before they are sent, and this registry is the one place
 * that cannot be forgotten. How to add the next one: docs/service-compatibility.md.
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
	/**
	 * The sub-selection a field needs, by field name, for any field above that is not a
	 * scalar. `brandLogoUrl: String` can be selected bare; `resolvedAgency: Agency`
	 * cannot, and a bare object field is a parse error rather than a missing value.
	 *
	 * Absent means scalar, which is the ordinary case. The names are still checked
	 * against the committed schemas as fields - this only says how to ask for them.
	 */
	selections?: Readonly<Record<string, string>>;
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
		// On dcb-service MAIN, and in no release: V9_0_008 landed after the 9.0.0 tag, so
		// `since` stays null and serviceCapabilities.test.ts says so. A SEPARATE row from
		// library_branding, whose since is 9.0.0 - one flag over both would be a lie about
		// one of them, and switching it on at the v9 upgrade would take LoadLibrary down
		// on every deployment running the release. LoadLibrary runs on every page.
		//
		// `patronWebsite` is deliberately absent: Library has carried it since 5.11.1, so
		// it needs no gate and is selected unconditionally.
		id: "library_support_url",
		flag: "VITE_FEATURE_LIBRARY_SUPPORT_URL",
		since: null,
		fields: {
			Library: ["supportUrl"],
			UpdateLibraryInput: ["supportUrl"],
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
	{
		// Which library a patron request belongs to. PatronIdentity gained resolvedAgency
		// in 9.0.0; before it the only recorded answer was patronHostlmsCode, which names
		// the system rather than the library and so cannot distinguish co-tenants on a
		// shared one. Nothing to fall back to - the older schema has no equivalent field,
		// and the page keeps its old agency lookup for that case.
		//
		// The same flag also switches the Lucene filter these views run under, which is
		// not a schema matter and so is not described here. See helpers/patronRequestScope.
		id: "agency_scoped_requests",
		flag: "VITE_FEATURE_AGENCY_SCOPED_REQUESTS",
		since: "9.0.0",
		fields: {
			PatronIdentity: ["resolvedAgency"],
		},
		selections: {
			resolvedAgency: "id code name",
		},
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
