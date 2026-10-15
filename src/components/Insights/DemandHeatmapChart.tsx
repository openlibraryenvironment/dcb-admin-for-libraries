import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, Typography, Box } from "@mui/material";
import { Heatmap } from "@mui/x-charts-pro";

import { useDcbRestClient } from "@/hooks/useDcbRestClient";
import { useChartPalette } from "@/hooks/useChartPalette";
import { demandHeatmapQueryOptions, StatsParams } from "@helpers/statsApi";
import { formatDayOfWeek, formatHourOfDay, formatNumber } from "@helpers/formatters";

import ChartDataTable from "./ChartDataTable";
import PanelState from "./PanelState";

const CHART_HEIGHT = 300;
const HOURS = Array.from({ length: 24 }, (_, h) => h);
const DAYS = Array.from({ length: 7 }, (_, d) => d);

export default function DemandHeatmapChart({
	params,
}: {
	params: StatsParams;
}) {
	const { t } = useTranslation();
	const client = useDcbRestClient();
	const { sequential } = useChartPalette();

	const { data, isLoading, isError, refetch, isFetching } = useQuery(
		demandHeatmapQueryOptions(client, params),
	);

	const days = useMemo(() => DAYS.map((day) => formatDayOfWeek(day)), []);

	const { series, maxCount, tableRows } = useMemo(() => {
		const cells = data ?? [];
		const heatmapData = cells.map(
			(c) => [c.hourOfDay, c.dayOfWeek, c.requestCount] as const,
		);
		const max = cells.reduce((m, c) => Math.max(m, c.requestCount), 0);

		// An hour with no requests is absent from the response; the table says 0
		// where the chart leaves the cell empty.
		const counts = days.map(() => HOURS.map(() => 0));
		for (const c of cells) {
			if (counts[c.dayOfWeek]?.[c.hourOfDay] !== undefined) {
				counts[c.dayOfWeek][c.hourOfDay] = c.requestCount;
			}
		}

		return {
			series: [
				{ data: heatmapData.map((d) => [...d] as [number, number, number]) },
			],
			maxCount: max,
			tableRows: days.map((day, d) => [
				day,
				...counts[d].map((count) => formatNumber(count)),
			]),
		};
	}, [data, days]);

	return (
		<Card variant="outlined">
			<CardContent>
				<Typography variant="h6" component="h3" gutterBottom>
					{t("insights.charts.demand_heatmap.title")}
				</Typography>
				<Typography variant="body2" color="text.secondary" gutterBottom>
					{t("insights.charts.demand_heatmap.subtitle")}
				</Typography>

				<PanelState
					isLoading={isLoading}
					isError={isError}
					isEmpty={maxCount === 0}
					onRetry={refetch}
					isRetrying={isFetching}
					height={CHART_HEIGHT}
				>
					{() => (
						<>
							{/* The 24-hour axis is wide; allow horizontal scroll on narrow screens. */}
							<Box sx={{ overflowX: "auto" }}>
								<Box sx={{ minWidth: 640 }}>
									<Heatmap
										height={CHART_HEIGHT}
										xAxis={[{ data: HOURS }]}
										yAxis={[{ data: days }]}
										zAxis={[
											{
												min: 0,
												max: maxCount,
												colorMap: {
													type: "continuous",
													min: 0,
													max: maxCount,
													color: sequential,
												},
											},
										]}
										series={series}
									/>
								</Box>
							</Box>
							<ChartDataTable
								caption={t("insights.charts.demand_heatmap.title")}
								columns={[
									t("insights.charts.demand_heatmap.day"),
									...HOURS.map((hour) => formatHourOfDay(hour)),
								]}
								rows={tableRows}
							/>
						</>
					)}
				</PanelState>
			</CardContent>
		</Card>
	);
}
