import { GridApiPro } from "@mui/x-data-grid-premium";
import { RefObject } from "react";
// Finds the first editable column, in order to apply focus to it.
export const findFirstEditableColumn = (apiRef: RefObject<GridApiPro>) => {
	const editableColumns = apiRef.current
		.getAllColumns()
		.filter((column: any) => column.editable);
	return editableColumns.length > 0 ? editableColumns[0].field : null;
};
