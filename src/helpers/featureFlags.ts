/**
 * Runtime feature flags, read from the injected config rather than
 * import.meta.env: a flag gating a feature on a BACKEND release has to be
 * flippable per environment without rebuilding the UI. Off unless turned on.
 * Adding one means touching inject_env.json.template too, and
 * featureFlags.test.ts fails if you forget. docs/service-compatibility.md.
 */
const readFlag = (name: string): boolean => {
	const injected =
		typeof window !== "undefined" ? window.__APP_ENV__?.[name] : undefined;
	const value = injected ?? import.meta.env[name];

	return String(value).toLowerCase() === "true";
};

/**
 * The guarded cleanup flow - dcb-service 9.0.0 and later.
 *
 * 9.0.0 refuses a cleanup that would delete the borrowing library's temporary records while
 * the item is out, and says so with a 409 this app reports. 8.71.0 has no such refusal: it
 * cleans up whatever it is asked to, so with this off the status list in
 * isCleanupEligible is the only gate and an item that has left the library is never offered.
 */
export const isGuardedCleanupEnabled = (): boolean =>
	readFlag("VITE_FEATURE_GUARDED_CLEANUP");

/**
 * Insights depends on the /insights/** endpoints, first released in dcb-service 9.0.0.
 * Enable with VITE_FEATURE_INSIGHTS=true once the environment's dcb-service is new
 * enough - an older one answers 404 to all of them.
 */
export const isInsightsEnabled = (): boolean =>
	readFlag("VITE_FEATURE_INSIGHTS");

/**
 * The patron-facing library brand - dcb-service 9.0.0 and later.
 *
 * NOT A RENDER SWITCH. It changes the DOCUMENT and the mutation VARIABLES,
 * because selecting a field 8.71.0 has never heard of takes the application
 * down rather than greying out a form. @constants/serviceCapabilities.
 */
export const isLibraryBrandingEnabled = (): boolean =>
	readFlag("VITE_FEATURE_LIBRARY_BRANDING");

/**
 * The library's patron support link - dcb-service AFTER 9.0.0.
 *
 * `library.support_url` arrived in V9_0_008, which is on main and in no release, so this
 * is a SEPARATE flag from the branding one above rather than a fourth field on it.
 * Selecting `supportUrl` against the 9.0.0 tag fails LoadLibrary whole, exactly as the
 * brand fields do against 8.71.0 - same failure, different threshold, which is the entire
 * reason the flags are per capability.
 *
 * `patronWebsite` beside it on the form is ungated: Library has carried it since 5.11.1.
 */
export const isLibrarySupportUrlEnabled = (): boolean =>
	readFlag("VITE_FEATURE_LIBRARY_SUPPORT_URL");

/**
 * Scoping a library's requests by agency code - dcb-service 9.0.0 and later.
 *
 * Two things move together behind this flag, which is why it is one and not two. The
 * Lucene filter changes from patronHostlmsCode to patronAgencyCode, and PatronIdentity
 * gains resolvedAgency. Sending either to an older deployment fails outright rather than
 * degrading: the query builder resolves a filter name against the entity's properties and
 * raises on one it does not know, and an undeclared selection field fails the whole
 * operation, not just that field.
 */
export const isAgencyScopedRequestsEnabled = (): boolean =>
	readFlag("VITE_FEATURE_AGENCY_SCOPED_REQUESTS");

/**
 * A flag by name, for code driven by the capability registry rather than by one feature.
 *
 * Deliberately NOT a way to invent a flag at a call site: every name passed here comes
 * from SERVICE_CAPABILITIES, and serviceCapabilities.test.ts asserts that every flag in
 * that registry is also declared above - so the named exports stay the complete list, and
 * featureFlags.test.ts keeps checking each of them reaches a deployment.
 */
export const isCapabilityEnabled = (flag: string): boolean => readFlag(flag);

/**
 * Percentile trends - `/insights/trend`, on dcb-service branch `insights-improvements`
 * and in NO release, not 8.71.0 and not the 9.0.0 tag.
 *
 * Separate from VITE_FEATURE_INSIGHTS because the thresholds differ: a deployment on
 * 9.0.0 has the Insights surface and answers 404 to this one endpoint, and a 404 through
 * the panel contract reads as "this panel could not be loaded" - a fault report for a
 * server that is simply older.
 */
export const isInsightsTrendsEnabled = (): boolean =>
	readFlag("VITE_FEATURE_INSIGHTS_TRENDS");

/**
 * Whether a discovery front end is deployed beside us — docs/DEPLOYMENT.md §2b.
 *
 * NOT a `VITE_FEATURE_*` and not a SERVICE_CAPABILITIES row: those say whether this
 * environment's dcb-service is new enough, and no dcb-service release can say
 * whether a discovery front end is deployed. So this one is a pure render switch,
 * which the flags above deliberately are not — it makes no claim about the schema,
 * leaves every document unchanged, and is composed WITH a capability flag rather
 * than replacing it. `VITE_`-prefixed because the dev fallback reads
 * `import.meta.env`, which needs that prefix.
 */
export const isDiscoveryActive = (): boolean => readFlag("VITE_DISCOVERY_ACTIVE");
