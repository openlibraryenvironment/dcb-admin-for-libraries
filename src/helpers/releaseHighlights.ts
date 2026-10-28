import type { Highlight } from "@constants/releaseHighlights";
import { isFeatureEnabled, type LibraryFeature } from "@helpers/libraryFeatures";

/**
 * The highlights this deployment can show, and the features switched off here that hold
 * the others back, each named once.
 */
export const highlightsHere = (
	items: readonly Highlight[],
): { shown: Highlight[]; notHere: LibraryFeature[] } => ({
	shown: items.filter((item) => (item.needs ?? []).every(isFeatureEnabled)),
	notHere: [...new Set(items.flatMap((item) => item.needs ?? []))].filter(
		(feature) => !isFeatureEnabled(feature),
	),
});
