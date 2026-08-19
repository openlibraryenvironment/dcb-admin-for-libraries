/**
 * Runtime feature flags.
 *
 * Deliberately read from the injected runtime config (`window.__APP_ENV__`,
 * populated in application.tsx from /inject_env.json) rather than from
 * `import.meta.env` at build time: a flag that gates a feature on a *backend*
 * release has to be flippable per environment without rebuilding and
 * redeploying the UI. The import.meta.env read is only the local-dev fallback.
 *
 * Adding a flag means adding it to docker/production/inject_env.json.template
 * too, or it is undefined in every deployed environment and the feature can
 * never be turned on. featureFlags.test.ts fails if you forget.
 *
 * Flags are off unless explicitly turned on, so an environment that has never
 * heard of the flag hides the feature.
 */
const readFlag = (name: string): boolean => {
	const injected =
		typeof window !== "undefined" ? window.__APP_ENV__?.[name] : undefined;
	const value = injected ?? import.meta.env[name];

	return String(value).toLowerCase() === "true";
};

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
 * THIS FLAG IS NOT A RENDER SWITCH. brandLogoUrl, brandLogoAlt and defaultThemeName do
 * not exist on Library before 9.0.0, and a GraphQL field the server has never heard of
 * is not a null - it is a validation error that fails the WHOLE operation. LoadLibrary
 * is run by the header on every page and by six routes, so selecting them on an older
 * deployment does not grey out a form, it takes the application down.
 *
 * So the flag changes the DOCUMENT and the mutation VARIABLES. See
 * @constants/serviceCapabilities and @helpers/capabilityFields.
 */
export const isLibraryBrandingEnabled = (): boolean =>
	readFlag("VITE_FEATURE_LIBRARY_BRANDING");

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
