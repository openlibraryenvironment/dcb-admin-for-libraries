import { TFunction } from "i18next";
import * as Yup from "yup";

/** The reason, category and reference recorded against an edit or a deletion. */
export const changeConfirmationSchema = (t: TFunction) =>
	Yup.object({
		reason: Yup.string()
			.required(t("data_change_log.reason_required"))
			.max(200, t("data_change_log.max_length_exceeded")),
		changeCategory: Yup.string()
			.required(t("data_change_log.category_required"))
			.max(200, t("data_change_log.max_length_exceeded")),
		changeReferenceUrl: Yup.string()
			.url(t("ui.data_grid.edit_url"))
			.typeError(t("ui.data_grid.edit_url"))
			.max(200, t("data_change_log.max_length_exceeded")),
	});
