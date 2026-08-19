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
 * Insights depends on the /patrons/requests/stats/** endpoints, which only exist
 * in the upcoming dcb-service release. Enable with VITE_FEATURE_INSIGHTS=true
 * once the environment's dcb-service is new enough.
 */
export const isInsightsEnabled = (): boolean =>
	readFlag("VITE_FEATURE_INSIGHTS");
