import Box from "@mui/material/Box";
import { visuallyHidden } from "@mui/utils";

import { useAnnouncer } from "@/hooks/useAnnouncer";

/**
 * The application's single live region.
 *
 * One region, mounted for the life of the app: a region added to the DOM at the
 * same moment it gains text is not reliably announced, because assistive
 * technology has to be watching it before the change. Result counts, filter
 * changes and mutation outcomes all speak through here.
 */
export const Announcer = () => {
	const message = useAnnouncer((state) => state.message);

	return (
		<Box
			role="status"
			aria-live="polite"
			aria-atomic="true"
			sx={visuallyHidden}
		>
			{message}
		</Box>
	);
};
