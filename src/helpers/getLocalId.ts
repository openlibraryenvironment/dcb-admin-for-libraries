export function getLocalId(ils: string): string {
	switch (ils) {
		case "FOLIO":
			return "location.service_point";
		case "Polaris":
			return "location.polaris_org";
		case "Sierra":
			return "location.sierra";
		default:
			return "location.local_id";
	}
}
