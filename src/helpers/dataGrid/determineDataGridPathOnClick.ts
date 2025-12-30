import {
	nonClickableTypes,
	specialRedirectionTypes,
} from "@constants/dataGrid/types";

export function determineDataGridPathOnClick(type: string, rowId: string) {
	if (specialRedirectionTypes.includes(type)) {
		if (type === "dataChangeLog") {
			return `/serviceInfo/dataChangeLog/${rowId}`;
		} else {
			return `/patronRequests/${rowId}`;
		}
	} else if (
		// Others we don't want users to be able to click through on
		!nonClickableTypes.includes(type)
	) {
		// Whereas most can just use this standard redirection based on type
		return `/${type}/${rowId}`;
	}
	return "";
}
