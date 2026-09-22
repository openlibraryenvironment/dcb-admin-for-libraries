import { TFunction } from "i18next";
import * as Yup from "yup";

import {
	agencyCodeField,
	patronBarcodeField,
	pickupLocationIdField,
	requiredField,
} from "./requestFields";

/** On-site borrowing: the item is always the staff library's own. */
export const expeditedCheckoutSchema = (t: TFunction) =>
	Yup.object().shape({
		patronBarcode: patronBarcodeField(t),
		agencyCode: agencyCodeField(t),
		pickupLocationId: pickupLocationIdField(t),
		requesterNote: Yup.string(),
		itemLocalId: Yup.string().required(
			requiredField(t, "requesting.staff_request.patron.item_local_id"),
		),
		itemLocalSystemCode: Yup.string().required(),
		itemAgencyCode: Yup.string().required(
			requiredField(t, "requesting.staff_request.patron.item_library"),
		),
	});
