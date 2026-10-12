import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

import CollectionTotalsTiles from "./CollectionTotalsTiles";
import ClusterQualityPanel from "./ClusterQualityPanel";
import CollectionProfilePanel from "./CollectionProfilePanel";
import FormatMixPanel from "./FormatMixPanel";
import CollectionOverlapPanel from "./CollectionOverlapPanel";
import LazyPanel from "./LazyPanel";

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

			<LazyPanel minHeight={160}>
				<CollectionTotalsTiles />
			</LazyPanel>

			<LazyPanel minHeight={360}>
				<Box
					sx={{
						display: "grid",
						gap: 3,
						gridTemplateColumns: { xs: "1fr", lg: "repeat(2, 1fr)" },
					}}
				>
					{/* Confidence first: it qualifies every number in this section. */}
					<ClusterQualityPanel />
					<CollectionProfilePanel libraryCode={libraryCode} />
				</Box>
			</LazyPanel>

			<LazyPanel minHeight={340}>
				<Box
					sx={{
						display: "grid",
						gap: 3,
						gridTemplateColumns: { xs: "1fr", lg: "repeat(2, 1fr)" },
					}}
				>
					<FormatMixPanel libraryCode={libraryCode} />
					<CollectionOverlapPanel libraryCode={libraryCode} />
				</Box>
			</LazyPanel>
		</>
	);
}
