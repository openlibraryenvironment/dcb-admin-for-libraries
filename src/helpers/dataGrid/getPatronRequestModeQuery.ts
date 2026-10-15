import {
	borrowedByLibraryQuery,
	suppliedByLibraryQuery,
} from "@helpers/patronRequestScope";

export function getPatronRequestModeQuery(
	mode: string,
	code: string,
	patronHostLmsCode: string,
) {
	switch (mode) {
		case "borrowing":
			return borrowedByLibraryQuery(code, patronHostLmsCode);
		case "supplying":
			return suppliedByLibraryQuery(code);
		default:
			return "";
	}
}
