import { capability, meetsServiceVersion } from "@constants/serviceCapabilities";
import { isCapabilityEnabled } from "@helpers/featureFlags";

// Not every registry row: a feature here is one a library would notice, over every
// capability it is made of, and needs the newest of them. docs/service-compatibility.md
const FEATURES = {
	library_branding: ["library_branding"],
	announcements: ["announcements"],
	library_support_url: ["library_support_url"],
	insights: ["insights", "insights_trends", "insights_walk_up"],
	guarded_cleanup: ["guarded_cleanup"],
	request_tags: ["request_tags"],
	request_notes: ["request_notes"],
	pickup_requests: ["pickup_requests"],
	agency_scoped_requests: ["agency_scoped_requests"],
} as const satisfies Record<string, readonly string[]>;

export type LibraryFeature = keyof typeof FEATURES;

/** Preferences' Feature availability heading, which What's new links to. */
export const FEATURE_AVAILABILITY_ID = "feature-availability";

/** In the order Preferences lists them; each is feature_availability.feature.<id>. */
export const LIBRARY_FEATURES = Object.keys(FEATURES) as LibraryFeature[];

const newest = (versions: readonly (string | null)[]): string | null =>
	versions.reduce((latest, since) =>
		latest === null || since === null
			? null
			: meetsServiceVersion(since, latest)
				? since
				: latest,
	);

/** The lowest dcb-service that serves every part of it, or null when no release does. */
export const featureSince = (feature: LibraryFeature): string | null =>
	newest(FEATURES[feature].map((id) => capability(id).since));

/** Switched on here: every one of its capabilities' flags. */
export const isFeatureEnabled = (feature: LibraryFeature): boolean =>
	FEATURES[feature].every((id) => isCapabilityEnabled(capability(id).flag));
