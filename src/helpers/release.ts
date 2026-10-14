import { queryOptions } from "@tanstack/react-query";

import { assetUrl, storageKey } from "@helpers/appBase";
import { queryKeys } from "@helpers/queryKeys";

/** The public mirror, whose release pages carry each version's notes. */
export const RELEASES_URL = "https://github.com/openlibraryenvironment/dcb-admin-for-libraries/releases";

/** What this running build knows about itself. docs/release-highlights.md. */
export interface ReleaseInfo {
	/** "1.14.0", or null for a build no release deployed. */
	version: string | null;
	/** The commit, from the build stamp, for a build with no version. */
	build: string | null;
}

const SEMVER = /^v?(\d+\.\d+\.\d+)$/;

/** A version as a deploy wrote it, "v1.14.0" or "1.14.0"; anything else is none. */
export const parseVersion = (value: unknown): string | null => {
	const match = typeof value === "string" ? SEMVER.exec(value.trim()) : null;
	return match ? match[1] : null;
};

/** The bootloader serves each release from a directory named for it: .../v1.14.0/. */
export const versionFromBundleUrl = (url: string | undefined): string | null => {
	const match = url ? /\/(v\d+\.\d+\.\d+)\/$/.exec(url) : null;
	return match ? parseVersion(match[1]) : null;
};

const buildStamp = (): string | null => {
	const content = document
		.querySelector('meta[name="dcb-admin-for-libraries-build"]')
		?.getAttribute("content");
	return content && content !== "local" && /^[0-9a-f]{7,40}$/.test(content) ? content : null;
};

const readReleaseFile = async (): Promise<string | null> => {
	try {
		// Written beside the bundle by the deploy job, which alone knows the version: the build
		// runs before semantic-release chooses it
		const response = await fetch(assetUrl("release.json"), { cache: "no-cache" });
		if (!response.ok || response.headers.get("Content-Type")?.includes("text/html")) return null;
		const body: unknown = await response.json();
		return typeof body === "object" && body !== null && "version" in body
			? parseVersion(body.version)
			: null;
	} catch {
		return null;
	}
};

export const releaseInfoQueryOptions = () =>
	queryOptions({
		queryKey: queryKeys.release.info(),
		queryFn: async (): Promise<ReleaseInfo> => ({
			version: versionFromBundleUrl(window.__DCB_BUNDLE_BASE_URL__) ?? (await readReleaseFile()),
			build: buildStamp(),
		}),
		// A running build does not change version
		staleTime: Infinity,
		retry: false,
	});

/** A version's own notes, or every release when the version is not known. */
export const releaseNotesUrl = (version: string | null): string =>
	version ? `${RELEASES_URL}/tag/v${version}` : RELEASES_URL;

const SEEN_KEY = () => storageKey("releaseHighlightsSeen");

/**
 * The highlights generation this browser last dismissed, per browser like the home page's
 * last visit: a shared desk shares it. User preferences will make it the account's.
 */
export const readSeenHighlights = (): number => {
	try {
		const seen = Number.parseInt(localStorage.getItem(SEEN_KEY()) ?? "", 10);
		return Number.isSafeInteger(seen) && seen >= 0 ? seen : 0;
	} catch {
		return 0;
	}
};

export const writeSeenHighlights = (generation: number): void => {
	try {
		localStorage.setItem(SEEN_KEY(), String(generation));
	} catch {
		// Blocked storage: the highlights show again next time, which is the safe side
	}
};
