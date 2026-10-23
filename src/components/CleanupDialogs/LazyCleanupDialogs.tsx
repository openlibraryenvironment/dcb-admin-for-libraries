import { lazy, Suspense, useState } from "react";

import type { PatronRequestCleanup } from "@/hooks/usePatronRequestCleanup";

// The results dialog holds three grids of its own: loaded on the first clean up, not with the page
const CleanupDialogs = lazy(() => import("./CleanupDialogs"));

export function LazyCleanupDialogs({ cleanup }: { cleanup: PatronRequestCleanup }) {
	const open = cleanup.cleanupState.open || cleanup.overrideConfirmOpen;
	// Mounted from the first open on, so later closes keep their transition and focus return
	const [opened, setOpened] = useState(open);
	if (open && !opened) setOpened(true);

	return opened ? (
		<Suspense fallback={null}>
			<CleanupDialogs cleanup={cleanup} />
		</Suspense>
	) : null;
}
