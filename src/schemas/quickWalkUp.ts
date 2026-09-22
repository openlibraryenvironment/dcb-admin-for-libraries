import { TFunction } from "i18next";
import * as Yup from "yup";

/**
 * Deliberately not built from requestFields: every message here is the bare
 * "required" without a field name, and the item is identified by barcode
 * rather than by local id.
 */
export const quickWalkUpSchema = (t: TFunction) =>
	Yup.object().shape({
		patronBarcode: Yup.string().required(t("ui.validation.required")),
		agencyCode: Yup.string().required(t("ui.validation.required")),
		itemBarcode: Yup.string().required(t("ui.validation.required")),
		pickupLocationCode: Yup.string().required(t("ui.validation.required")),
	});
