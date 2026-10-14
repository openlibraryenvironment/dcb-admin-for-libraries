import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import ReleaseHighlightsDialog from "./ReleaseHighlightsDialog";
import { HIGHLIGHTS_GENERATION, shouldShowHighlights } from "@constants/releaseHighlights";
import {
	readSeenHighlights,
	releaseInfoQueryOptions,
	writeSeenHighlights,
} from "@helpers/release";

/** Once per highlights generation, on the first signed-in page after a release ships them. */
export default function ReleaseHighlightsOnSignIn() {
	const [unseen] = useState(() => shouldShowHighlights(readSeenHighlights()));
	const [dismissed, setDismissed] = useState(false);
	const release = useQuery({ ...releaseInfoQueryOptions(), enabled: unseen });

	// Every way out counts as seen: the button, Escape and the backdrop
	const close = () => {
		writeSeenHighlights(HIGHLIGHTS_GENERATION);
		setDismissed(true);
	};

	return (
		<ReleaseHighlightsDialog
			// After the version is known, so the title does not change under the reader
			open={unseen && !dismissed && release.isFetched}
			onClose={close}
			version={release.data?.version ?? null}
		/>
	);
}
