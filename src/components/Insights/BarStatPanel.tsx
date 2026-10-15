import { useTranslation } from "react-i18next";
import { useQuery, type QueryFunctionContext } from "@tanstack/react-query";
import { Card, CardContent, Typography } from "@mui/material";
import { BarChartPro } from "@mui/x-charts-pro";

import { formatNumber } from "@helpers/formatters";

import ChartDataTable from "./ChartDataTable";
import PanelState from "./PanelState";

const CHART_HEIGHT = 320;

interface BarStatPanelProps<T> {
	titleKey: string;
	subtitleKey: string;
	seriesLabelKey: string;
	/** Heads the column of labels in the chart's data table. */
	categoryKey: string;
	// A statsApi *QueryOptions(...) result. Built by the parent with the rest client.
	queryOptions: {
		queryKey: readonly unknown[];
		queryFn: (context: QueryFunctionContext) => Promise<T[]>;
	};
	getLabel: (row: T) => string;
	getValue: (row: T) => number;
	color: string;
	horizontal?: boolean;
	limit?: number;
}

// Generic single-series bar panel - one hue, magnitude ranking. Reused for every
// "count by category" stat so we don't duplicate chart boilerplate per endpoint.
export default function BarStatPanel<T>({
	titleKey,
	subtitleKey,
	seriesLabelKey,
	categoryKey,
	queryOptions,
	getLabel,
	getValue,
	color,
	horizontal = false,
	limit = 15,
}: BarStatPanelProps<T>) {
	const { t } = useTranslation();
	const { data, isLoading, isError, refetch, isFetching } =
		useQuery(queryOptions);

	const rows = (data ?? []).slice(0, limit);
	const labels = rows.map(getLabel);
	const values = rows.map(getValue);

	const bandAxis = [{ scaleType: "band" as const, data: labels }];
	const series = [{ data: values, label: t(seriesLabelKey), color }];

	return (
		<Card variant="outlined">
			<CardContent>
				<Typography variant="h6" component="h3" gutterBottom>
					{t(titleKey)}
				</Typography>
				<Typography variant="body2" color="text.secondary" gutterBottom>
					{t(subtitleKey)}
				</Typography>

				<PanelState
					isLoading={isLoading}
					isError={isError}
					isEmpty={rows.length === 0}
					onRetry={refetch}
					isRetrying={isFetching}
					height={CHART_HEIGHT}
				>
					{() => (
						<>
							{horizontal ? (
								<BarChartPro
									height={CHART_HEIGHT}
									layout="horizontal"
									yAxis={bandAxis}
									series={series}
									margin={{ left: 160 }}
								/>
							) : (
								<BarChartPro
									height={CHART_HEIGHT}
									xAxis={bandAxis}
									series={series}
								/>
							)}
							<ChartDataTable
								caption={t(titleKey)}
								columns={[t(categoryKey), t(seriesLabelKey)]}
								rows={labels.map((label, index) => [
									label,
									formatNumber(values[index]),
								])}
							/>
						</>
					)}
				</PanelState>
			</CardContent>
		</Card>
	);
}
