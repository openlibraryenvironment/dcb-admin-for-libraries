import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Typography } from "@mui/material";
import { BarChartPro } from "@mui/x-charts-pro";

import { useDcbRestClient } from "@/hooks/useDcbRestClient";
import { useChartPalette } from "@/hooks/useChartPalette";
import { formatNumber, formatPercent } from "@helpers/formatters";
import {
	clusterSizeDistributionQueryOptions,
	type ClusterSizeStat,
} from "@helpers/statsApi";
import {
	bucketedHolders,
	clusterQuality,
	isUnderClustered,
} from "@helpers/insightsCollection";
import ChartDataTable from "./ChartDataTable";
import CollectionPanel from "./CollectionPanel";
import MetricInfo from "./MetricInfo";

const CHART_HEIGHT = 260;

/**
 * How many libraries hold each work - and therefore how much the rest of this section can
 * be believed.
 *
 * dcb-service ships this distribution beside the counts it qualifies rather than after
 * them, for a reason worth repeating here: if nearly every work has exactly one holder,
 * the matcher has failed to cluster and "titles only we hold" is measuring the matcher,
 * not the collection. The warning below is that check made visible.
 */
export default function ClusterQualityPanel() {
	const { t } = useTranslation();
	const client = useDcbRestClient();

	return (
		<CollectionPanel<ClusterSizeStat[]>
			titleKey="insights.collection.cluster_quality.title"
			info={
				<MetricInfo
					metric="clustering_confidence"
					label={t("insights.collection.cluster_quality.title")}
				/>
			}
			subtitleKey="insights.collection.cluster_quality.subtitle"
			queryOptions={clusterSizeDistributionQueryOptions(client)}
			isEmpty={(rows) => rows.length === 0}
			minHeight={CHART_HEIGHT + 80}
		>
			{(rows) => <ClusterQualityBody rows={rows} />}
		</CollectionPanel>
	);
}

function ClusterQualityBody({ rows }: { rows: ClusterSizeStat[] }) {
	const { t } = useTranslation();
	const { categorical } = useChartPalette();

	const { buckets, quality } = useMemo(
		() => ({ buckets: bucketedHolders(rows), quality: clusterQuality(rows) }),
		[rows],
	);

	const singlePct =
		quality.singleHolderPct != null ? formatPercent(quality.singleHolderPct) : "—";

	return (
		<>
			<Typography variant="body2" gutterBottom>
				{t("insights.collection.cluster_quality.summary", {
					single: singlePct,
					total: formatNumber(quality.totalClusters),
					commonest:
						quality.commonestHolderCount != null
							? formatNumber(quality.commonestHolderCount)
							: "—",
				})}
			</Typography>

			{isUnderClustered(quality) && (
				<Alert severity="warning" sx={{ mb: 2 }}>
					{t("insights.collection.cluster_quality.under_clustered", {
						single: singlePct,
					})}
				</Alert>
			)}

			<BarChartPro
				height={CHART_HEIGHT}
				xAxis={[
					{
						scaleType: "band",
						data: buckets.map((b) => b.label),
						label: t("insights.collection.cluster_quality.axis_holders"),
					},
				]}
				series={[
					{
						data: buckets.map((b) => b.clusterCount),
						label: t("insights.collection.cluster_quality.series"),
						color: categorical[0],
					},
				]}
			/>
			<ChartDataTable
				caption={t("insights.collection.cluster_quality.title")}
				columns={[
					t("insights.collection.cluster_quality.axis_holders"),
					t("insights.collection.cluster_quality.series"),
				]}
				rows={buckets.map((b) => [b.label, formatNumber(b.clusterCount)])}
			/>
		</>
	);
}
