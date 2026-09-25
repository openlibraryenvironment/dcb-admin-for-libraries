import { TFunction } from "i18next";
import * as Yup from "yup";

import {
	agencyCodeField,
	patronBarcodeField,
	pickupLocationIdField,
	requiredField,
} from "./requestFields";

/**
 * The item fields are required only under manual selection: automatic
 * selection is the supplier being chosen for the requester, so there is
 * nothing for them to fill in.
 */
export const staffRequestSchema = (t: TFunction) =>
	Yup.object().shape({
		patronBarcode: patronBarcodeField(t),
		agencyCode: agencyCodeField(t),
		pickupLocationId: pickupLocationIdField(t),
		requesterNote: Yup.string(),
		selectionType: Yup.string().required(
			requiredField(t, "requesting.staff_request.patron.selection.type"),
		),
		itemLocalId: Yup.string().when("selectionType", {
			is: "manual",
			then: (schema) =>
				schema.required(
					requiredField(t, "requesting.staff_request.patron.item_local_id"),
				),
			otherwise: (schema) => schema.notRequired(),
		}),
		itemAgencyCode: Yup.string().when("selectionType", {
			is: "manual",
			then: (schema) =>
				schema.required(
					requiredField(t, "requesting.staff_request.patron.item_library"),
				),
			otherwise: (schema) => schema.notRequired(),
		}),
	});
