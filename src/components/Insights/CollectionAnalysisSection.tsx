import { Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

import CollectionTotalsTiles from "./CollectionTotalsTiles";
import ClusterQualityPanel from "./ClusterQualityPanel";
import CollectionProfilePanel from "./CollectionProfilePanel";
import FormatMixPanel from "./FormatMixPanel";
import CollectionOverlapPanel from "./CollectionOverlapPanel";
import PanelRow from "./PanelRow";
import { isInsightsPanelShown as shown } from "@helpers/featureFlags";

/**
 * What the catalogue holds, beside the rest of Insights, which counts what was asked for.
 * The totals, clustering confidence and profile are consortium-wide, with this library
 * pinned and highlighted; the format mix and overlap are this library's own. None of it
 * takes the date window. Who may see whose collection: docs/insights.md.
 */
export default function CollectionAnalysisSection({
	libraryCode,
}: {
	libraryCode: string;
}) {
	const { t } = useTranslation();

	return (
		<>
			<Typography variant="body2" color="text.secondary">
				{t("insights.collection.section_subtitle")}
			</Typography>

			<PanelRow minHeight={160}>
				{shown("collection.totals") && <CollectionTotalsTiles />}
			</PanelRow>

			{/* Confidence first: it qualifies every number in this section. */}
			<PanelRow minHeight={360}>
				{shown("collection.clusterQuality") && <ClusterQualityPanel />}
				{shown("collection.profile") && <CollectionProfilePanel libraryCode={libraryCode} />}
			</PanelRow>

			<PanelRow minHeight={340}>
				{shown("collection.formatMix") && <FormatMixPanel libraryCode={libraryCode} />}
				{shown("collection.overlap") && <CollectionOverlapPanel libraryCode={libraryCode} />}
			</PanelRow>
		</>
	);
}
