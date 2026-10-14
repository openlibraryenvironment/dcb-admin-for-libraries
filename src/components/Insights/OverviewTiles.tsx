import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Box } from "@mui/material";

import { useDcbRestClient } from "@/hooks/useDcbRestClient";
import { formatNumber, formatPercent } from "@helpers/formatters";
import { fillRate } from "@helpers/fillRate";
import { formatTurnaround } from "@helpers/insightsRange";
import {
	StatsParams,
	dashboardQueryOptions,
	netFlowQueryOptions,
	supplierResponseSlaQueryOptions,
} from "@helpers/statsApi";
import KpiTile from "./KpiTile";

/**
 * The five figures a library director asks for: were my patrons served, and am I carrying
 * my share. Shown above every Insights subject, and on the home page.
 */
export default function OverviewTiles({ params }: { params: StatsParams }) {
	const { t } = useTranslation();
	const client = useDcbRestClient();

	// The whole KPI header in ONE round-trip (prior window + all aggregates fanned out
	// server-side); the dashboard asks for the same key and the cache serves both.
	const dashboard = useQuery(dashboardQueryOptions(client, params));
	const d = dashboard.data;
	const loading = dashboard.isLoading;

	// One row each for this app: it reports on one library
	const myResponse = useQuery(supplierResponseSlaQueryOptions(client, params));
	const netFlow = useQuery(netFlowQueryOptions(client, params));

	const netRow = netFlow.data?.[0];
	const netBalance = netRow ? netRow.suppliedCount - netRow.borrowedCount : null;

	const currentRate = d
		? fillRate(d.fulfillmentCurrent.successfulCount, d.fulfillmentCurrent.failedCount)
		: null;
	const priorRate = d
		? fillRate(d.fulfillmentPrior.successfulCount, d.fulfillmentPrior.failedCount)
		: null;
	const rateDelta =
		currentRate != null && priorRate != null ? currentRate - priorRate : null;
	const resolved = d
		? d.fulfillmentCurrent.successfulCount + d.fulfillmentCurrent.failedCount
		: 0;
	const totalLends = d?.lendBorrowTotals.suppliedCount ?? 0;

	return (
		<Box
			sx={{
				display: "grid",
				gap: 2,
				gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
			}}
		>
			<KpiTile
				title={t("insights.kpi.resolved.title")}
				metric="requests_fulfilled"
				value={formatNumber(resolved)}
				subtitle={
					currentRate != null
						? t("insights.headline.filled", { rate: formatPercent(currentRate) })
						: t("insights.kpi.resolved.subtitle")
				}
				deltaPct={rateDelta}
				higherIsBetter
				loading={loading}
			/>
			<KpiTile
				title={t("insights.headline.patron_waited")}
				metric="turnaround_to_loan"
				value={formatTurnaround(d?.turnaroundToLoaned?.p50Seconds, t)}
				subtitle={t("insights.kpi.time_to_loan.subtitle", {
					p95: formatTurnaround(d?.turnaroundToLoaned?.p95Seconds, t),
				})}
				loading={loading}
			/>
			<KpiTile
				title={t("insights.headline.supplied")}
				metric="items_supplied"
				value={formatNumber(totalLends)}
				subtitle={t("insights.kpi.total_lends.subtitle")}
				loading={loading}
			/>
			<KpiTile
				title={t("insights.headline.my_response")}
				metric="supplier_response"
				value={formatTurnaround(myResponse.data?.[0]?.medianResponseSeconds, t)}
				subtitle={t("insights.headline.my_response_sub")}
				loading={myResponse.isLoading}
			/>
			<KpiTile
				title={t("insights.headline.net_flow")}
				metric="net_flow"
				value={
					netBalance == null
						? "—"
						: formatNumber(netBalance, { signDisplay: "exceptZero" })
				}
				subtitle={
					netBalance == null
						? undefined
						: t(
								netBalance >= 0
									? "insights.headline.net_lender"
									: "insights.headline.net_borrower",
							)
				}
				loading={netFlow.isLoading}
			/>
		</Box>
	);
}
