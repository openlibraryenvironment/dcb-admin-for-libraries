export function getPatronRequestModeQuery(
	mode: string,
	code: string,
	patronHostLmsCode: string,
) {
	switch (mode) {
		case "borrowing":
			return "patronHostlmsCode:" + patronHostLmsCode;
		case "supplying":
			return "supplyingAgencyCode:" + code;
		default:
			return "";
		// Pickup coming soon ...
	}
}
