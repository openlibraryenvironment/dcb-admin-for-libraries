import { TFunction } from "i18next";
import * as Yup from "yup";

import {
	BRAND_LIMITS,
	isValidLinkUrl,
	isValidLogoUrl,
} from "@/constants/discoveryBranding";

/** Trimmed text with the shared "at most N characters" message. */
const boundedText = (t: TFunction, length: number) =>
	Yup.string()
		.trim()
		.max(length, t("ui.validation.max_length", { length }));

/**
 * An empty box is not zero degrees: it clears the coordinate. `nullable` is
 * what makes that true - without it the transform produced a null that
 * Yup.number() rejects, with its own untranslated "latitude cannot be null".
 */
const coordinate = (t: TFunction, bound: number, messageKey: string) =>
	Yup.number()
		.transform((value, originalValue) => (originalValue === "" ? null : value))
		.nullable()
		.typeError(t(messageKey))
		.min(-bound, t(messageKey))
		.max(bound, t(messageKey));

const linkUrl = (t: TFunction) =>
	boundedText(t, BRAND_LIMITS.linkUrl).test(
		"absolute-http-url",
		t("library.presence.url_invalid"),
		isValidLinkUrl,
	);

/**
 * Mirrors dcb-service's BrandingValidator so the administrator is told at the
 * field rather than by a rejected save. Blank is valid at every branding field
 * and means "clear it" - a library that uploaded the wrong mark must be able to
 * remove it.
 */
export const libraryProfileSchema = (t: TFunction) =>
	Yup.object().shape({
		fullName: boundedText(t, 255)
			.nonNullable(t("ui.validation.required"))
			.required(t("ui.validation.required", { field: t("library.full_name") })),
		shortName: boundedText(t, 32),
		// The message says 128 where the bound is 32. Left as found: changing
		// either half is a copy decision, not a refactor.
		abbreviatedName: Yup.string()
			.trim()
			.nonNullable(t("ui.validation.required"))
			.max(32, t("ui.validation.max_length", { length: 128 })),
		latitude: coordinate(t, 90, "ui.validation.locations.lat"),
		longitude: coordinate(t, 180, "ui.validation.locations.long"),
		backupDowntimeSchedule: boundedText(t, 200),
		supportHours: boundedText(t, 200),
		brandLogoUrl: boundedText(t, BRAND_LIMITS.logoUrl).test(
			"absolute-http-url",
			t("library.brand.logo_url_invalid"),
			isValidLogoUrl,
		),
		brandLogoAlt: boundedText(t, BRAND_LIMITS.logoAlt),
		defaultThemeName: boundedText(t, BRAND_LIMITS.themeName),
		// V-11.1. Both become an href in the discovery app's footer, and
		// dcb-service refuses anything that is not an absolute http(s) URL on
		// write - so the rule is checked under the box rather than reported as a
		// 400 with no field attached.
		patronWebsite: linkUrl(t),
		supportUrl: linkUrl(t),
	});
