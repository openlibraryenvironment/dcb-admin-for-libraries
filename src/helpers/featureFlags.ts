import { selectPages, type InsightsPage, type Selection } from "@helpers/insightsPages";

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
 * the item is out, with a 409 this app reports and lets the user override (force=true). 8.71.0 has no such refusal: it
 * cleans up whatever it is asked to, so with this off the status list in
 * isCleanupEligible is the only gate and an item that has left the library is never offered.
 */
export const isGuardedCleanupEnabled = (): boolean =>
	readFlag("VITE_FEATURE_GUARDED_CLEANUP");

/**
 * Confirming a supplied request's item is back on the shelf - dcb-service 9.2.0 and later
 * (POST .../transition/confirm-returned). An older service answers 404.
 */
export const isConfirmItemReturnedEnabled = (): boolean =>
	readFlag("VITE_FEATURE_CONFIRM_ITEM_RETURNED");

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
 * Patron announcements - dcb-service 9.2.0 and later.
 *
 * Asking a deployment that lacks them for `announcements` is a GraphQL validation error
 * that fails the whole operation, so this flag changes the DOCUMENT, not just what renders.
 */
export const isAnnouncementsEnabled = (): boolean =>
	readFlag("VITE_FEATURE_ANNOUNCEMENTS");

/**
 * The library's patron support link - dcb-service 9.2.0 and later.
 *
 * A SEPARATE flag from the branding one above rather than a fourth field on it.
 * Selecting `supportUrl` against 9.0.0 or 9.1.0 fails LoadLibrary whole, exactly as the
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
 * Percentile trends - `/insights/trend`, first released in dcb-service 9.1.0; not in
 * 8.71.0 or 9.0.0.
 *
 * Separate from VITE_FEATURE_INSIGHTS because the thresholds differ: a deployment on
 * 9.0.0 has the Insights surface and answers 404 to this one endpoint, and a 404 through
 * the panel contract reads as "this panel could not be loaded" - a fault report for a
 * server that is simply older.
 */
export const isInsightsTrendsEnabled = (): boolean =>
	readFlag("VITE_FEATURE_INSIGHTS_TRENDS");

/**
 * Walk-up against shipped - `/insights/library-breakdown`, dcb-service 9.2.0 and later.
 *
 * Separate from VITE_FEATURE_INSIGHTS for the trends flag's reason: 9.0.0 and 9.1.0
 * answer this one endpoint 404, which the panel would report as a fault.
 */
export const isInsightsWalkUpEnabled = (): boolean =>
	readFlag("VITE_FEATURE_INSIGHTS_WALK_UP");

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

/*
 * The home page's optional parts - docs/home.md. Render switches like VITE_DISCOVERY_ACTIVE, not
 * capabilities; where a part needs a capability, its function requires that flag too, so
 * the rule lives here rather than at each call site.
 */
export const isHomeSinceLastVisitEnabled = (): boolean =>
	readFlag("VITE_FEATURE_HOME_SINCE_LAST_VISIT");

export const isHomeLastWeekEnabled = (): boolean =>
	readFlag("VITE_FEATURE_HOME_LAST_WEEK");

export const isHomeSetupChecklistEnabled = (): boolean =>
	readFlag("VITE_FEATURE_HOME_SETUP_CHECKLIST");

export const isHomeInsightsEnabled = (): boolean =>
	readFlag("VITE_FEATURE_HOME_INSIGHTS") && isInsightsPageShown("insights");

export const isHomeAnnouncementsEnabled = (): boolean =>
	readFlag("VITE_FEATURE_HOME_ANNOUNCEMENTS") && isAnnouncementsEnabled();

// Before agency scoping, "your patrons" is a shared Host LMS: every co-tenant's row would match
export const isHomeLibrarySplitEnabled = (): boolean =>
	readFlag("VITE_FEATURE_HOME_LIBRARY_SPLIT") && isAgencyScopedRequestsEnabled();

// 9.0.0's AgencyAccessScope hides requests a library only collects, so this would read 0 there
export const isHomePickupHereEnabled = (): boolean =>
	readFlag("VITE_FEATURE_HOME_PICKUP_HERE") && !isAgencyScopedRequestsEnabled();

/** A setting that is not on or off, read from where readFlag reads. */
const readSetting = (name: string): string | undefined => {
	const injected =
		typeof window !== "undefined" ? window.__APP_ENV__?.[name] : undefined;
	const value = injected ?? import.meta.env[name];
	return typeof value === "string" ? value : undefined;
};

/** Parsed once per value, and a name it does not know reported once: docs/DEPLOYMENT.md, 2d. */
export const readSelection = <Name extends string>(
	name: string,
	parse: (raw: string | undefined) => Selection<Name>,
	warnUnknown: () => void,
) => {
	let last: { raw: string | undefined; shown: ReadonlySet<Name> } | undefined;
	return (): ReadonlySet<Name> => {
		const raw = readSetting(name);
		if (!last || last.raw !== raw) {
			const { shown, unknown } = parse(raw);
			if (unknown.length > 0) warnUnknown();
			last = { raw, shown };
		}
		return last.shown;
	};
};

const insightsPages = readSelection("VITE_INSIGHTS_PAGES", selectPages, () =>
	console.warn("VITE_INSIGHTS_PAGES names a page this app does not have: docs/DEPLOYMENT.md, 2d"),
);
/** An Insights page this deployment shows: VITE_INSIGHTS_PAGES, within VITE_FEATURE_INSIGHTS. */
export const isInsightsPageShown = (page: InsightsPage): boolean =>
	isInsightsEnabled() && insightsPages().has(page);
