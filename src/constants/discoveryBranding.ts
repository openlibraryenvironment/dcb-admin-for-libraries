/**
 * The patron-facing brand fields a library administrator sets, and what may go in them.
 *
 * These describe the DISCOVERY app (Symposia), not this one. `defaultThemeName` names a
 * theme from the discovery frontend's registry; it has nothing to do with this
 * application's own theme.
 *
 * <h2>Where the vocabulary really lives</h2>
 *
 * dcb-service validates `defaultThemeName` on write against `dcb.branding.theme-names`,
 * whose default is exactly the list below. That is the authority; this constant exists so
 * an administrator picks from a list rather than typing a name and learning it was wrong
 * from a rejected save — §C-5's requirement that configuration survive a non-specialist,
 * and this is the application where the least specialist administrators work.
 *
 * <h2>The third copy, knowingly</h2>
 *
 * symposia-ui ships the registry, dcb-service holds the configured vocabulary, and
 * dcb-admin-ui carries this same module for the consortium form. Extracting a shared
 * package is P-1 in NEXT_STAGE_PLAN.md and is parked on two unanswered questions (where it
 * publishes, and what it contains). The honest interim fix is smaller than that package:
 * a dcb-service query returning the configured list, which would delete both copies. Until
 * one of those happens, {@link themeOptions} folds the stored value in, so drift costs an
 * administrator a missing option and never costs them their setting.
 */
export const DISCOVERY_THEME_NAMES = ["openRS", "kInt"] as const;

/** Column widths in dcb-service's V8_73_002. Rejected here, not by Postgres. */
export const BRAND_LIMITS = {
	logoUrl: 400,
	logoAlt: 255,
	themeName: 64,
} as const;

/**
 * The path dcb-service serves uploaded brand assets from — R-17b.
 *
 * An upload returns a site-relative URL under this prefix, and dcb-service's
 * BrandingValidator accepts that form on write alongside an absolute http(s) URL. Kept in
 * step with `dcb.branding.assets.public-path-prefix`, whose default this is.
 */
export const BRAND_ASSET_PATH_PREFIX = "/discovery/brand-assets/";

/**
 * What the file picker offers, and what dcb-service will actually accept — R-17c.
 *
 * PNG and JPEG only. SVG is refused because it is a script-capable document and one
 * served from our own origin would be stored XSS in the chrome of every patron page,
 * including the sign-in page. WebP is refused because the server cannot re-encode it, and
 * an image it cannot decode is one it will not store.
 *
 * This attribute is a CONVENIENCE, never a control: a file picker filter is a hint to the
 * operating system and says nothing about the bytes. dcb-service sniffs magic bytes and
 * ignores both the filename and the declared content type.
 */
export const BRAND_IMAGE_ACCEPT = "image/png,image/jpeg";

/** Matches `dcb.branding.assets.max-bytes`. Checked again, and properly, on the server. */
export const BRAND_IMAGE_MAX_BYTES = 2 * 1024 * 1024;

/** The shape dcb-service's asset store mints: a SHA-256 and an extension it re-encodes to. */
const ASSET_KEY = /^[0-9a-f]{64}[.](png|jpg)$/;

/**
 * The theme choices to render, including whatever is currently stored.
 *
 * A value outside the known list means the deployment runs a discovery frontend we do not
 * ship, which `dcb.branding.theme-names` exists to allow. Dropping it from the options
 * would turn "this control does not know your theme" into "this control cleared your
 * theme" one save later.
 */
export function themeOptions(current?: string | null): string[] {
	const known: string[] = [...DISCOVERY_THEME_NAMES];
	return current && !known.includes(current) ? [...known, current] : known;
}

/**
 * Mirrors dcb-service's `BrandingValidator.logoUrl` so the administrator is told at the
 * field rather than by a rejected mutation.
 *
 * Absolute http(s) with a host, and nothing else. This URL becomes the `src` of an `<img>`
 * in the chrome of every page of the patron app, so `javascript:` and `data:` have no
 * legitimate use here, and a protocol-relative `//host/x` leaves the origin without ever
 * looking like it did. Blank is valid and means "clear it".
 */
export function isValidLogoUrl(value?: string | null): boolean {
	const trimmed = value?.trim();
	if (!trimmed) {
		return true;
	}

	// R-17e. The one site-relative form we accept: an asset dcb-service stored itself,
	// named by its own content. The KEY is checked as well as the prefix, because a
	// "starts with" test would accept /discovery/brand-assets/../../something and a
	// prefix test that can be walked out of is not a prefix test.
	if (trimmed.startsWith(BRAND_ASSET_PATH_PREFIX)) {
		return ASSET_KEY.test(trimmed.slice(BRAND_ASSET_PATH_PREFIX.length));
	}

	let url: URL;
	try {
		url = new URL(trimmed);
	} catch {
		return false;
	}

	return (
		(url.protocol === "https:" || url.protocol === "http:") && url.host !== ""
	);
}
