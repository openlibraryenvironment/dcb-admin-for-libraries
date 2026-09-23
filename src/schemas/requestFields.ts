import { TFunction } from "i18next";
import * as Yup from "yup";

/**
 * Field definitions shared by the requesting forms. Composed, never branched:
 * a form that needs a different rule writes its own field rather than passing
 * a flag into one of these.
 */

/** "<field> is required", with the field name lower-cased as the copy expects. */
export const requiredField = (t: TFunction, fieldKey: string): string =>
	t("ui.validation.required", { field: t(fieldKey).toLowerCase() });

export const patronBarcodeField = (t: TFunction) =>
	Yup.string()
		.required(requiredField(t, "requesting.staff_request.patron.barcode"))
		.test(
			"no-square-brackets",
			t("requesting.staff_request.patron.error.no_brackets"),
			(value) => (value ? !value.includes("[") && !value.includes("]") : true),
		);

export const agencyCodeField = (t: TFunction) =>
	Yup.string().required(requiredField(t, "agency.code"));

export const pickupLocationIdField = (t: TFunction) =>
	Yup.string().required(
		requiredField(t, "requesting.staff_request.patron.pickup_location"),
	);
