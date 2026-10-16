import { UseNavigateResult } from "@tanstack/react-router";

export const handleClusterTabChange = (
	event: React.SyntheticEvent,
	newValue: string,
	recordId: string,
	navigate: UseNavigateResult<string>,
) => {
	switch (newValue) {
		case "items":
			navigate({ to: "/requesting/$recordId/items", params: { recordId } });
			break;
		case "history":
			navigate({ to: "/requesting/$recordId/history", params: { recordId } });
			break;
		default:
			navigate({ to: "/requesting/$recordId", params: { recordId } });
	}
};
