import { TFunction } from "i18next";
import * as Yup from "yup";

import { MAX_SAVED_FILTER_NAME } from "@helpers/savedFilters";

export const savedFilterSchema = (t: TFunction) =>
	Yup.object({
		name: Yup.string()
			.trim()
			.required(t("ui.data_grid.views.name_required"))
			.max(
				MAX_SAVED_FILTER_NAME,
				t("ui.data_grid.views.name_too_long", { count: MAX_SAVED_FILTER_NAME }),
			),
	});

export type SavedFilterForm = Yup.InferType<ReturnType<typeof savedFilterSchema>>;
