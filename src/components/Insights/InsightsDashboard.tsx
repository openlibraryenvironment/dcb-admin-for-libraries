import { useEffect, useMemo, type ReactNode } from "react";

import { formatDate, formatNumber, formatPercent } from "@helpers/formatters";
import { useAnnounce } from "@/hooks/useAnnouncer";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import {
	Accordion,
	AccordionDetails,
	AccordionSummary,
	Box,
	Stack,
	ToggleButton,
	ToggleButtonGroup,
	Typography,
} from "@mui/material";
import { DateRangePicker } from "@mui/x-date-pickers-pro";
import {
	MultiInputDateRangeField,
	type MultiInputDateRangeFieldProps,
} from "@mui/x-date-pickers-pro/MultiInputDateRangeField";
import dayjs from "dayjs";

import { useDcbRestClient } from "@/hooks/useDcbRestClient";
import { useChartPalette } from "@/hooks/useChartPalette";
import {
	ConsortialLifelineStat,
	PatronGroupDemandStat,
	PickupLocationDemandStat,
	RequestedTitleStat,
	StatsParams,
	TopClusterStat,
	UnfillableDemandStat,
	acquisitionOpportunitiesQueryOptions,
	consortialLifelineQueryOptions,
	dashboardQueryOptions,
	demandByPatronGroupQueryOptions,
	demandByPickupLocationQueryOptions,
	topRequestedTitlesQueryOptions,
	unfillableDemandQueryOptions,
	unmetLocalDemandQueryOptions,
} from "@helpers/statsApi";
import {
	localDay,
	statsWindow,
} from "@helpers/insightsRange";

import KpiTile from "./KpiTile";
import OverviewTiles from "./OverviewTiles";
import { fillRate } from "@helpers/fillRate";
import DurationsPanel from "./DurationsPanel";
import CostAvoidanceTile from "./CostAvoidanceTile";
import StatusFlowChart from "./StatusFlowChart";
import FailureTaxonomyChart from "./FailureTaxonomyChart";
import SupplierReliabilityChart from "./SupplierReliabilityChart";
import TimeInStatusChart from "./TimeInStatusChart";
import SupplierResponseSlaChart from "./SupplierResponseSlaChart";
import DemandHeatmapChart from "./DemandHeatmapChart";
import NetFlowChart from "./NetFlowChart";
import RareGemPanel from "./RareGemPanel";
import BarStatPanel from "./BarStatPanel";
import TableStatPanel from "./TableStatPanel";
import LazyPanel from "./LazyPanel";
import PeerBenchmarkPanel from "./PeerBenchmarkPanel";
import WalkUpDiversionPanel from "./WalkUpDiversionPanel";
import CollectionDimensionPanel from "./CollectionDimensionPanel";
import CollectionAnalysisSection from "./CollectionAnalysisSection";
import TradingPartnersPanel from "./TradingPartnersPanel";
import NewAcquisitionsPanel from "./NewAcquisitionsPanel";
import SubjectBar from "./SubjectBar";
import { InsightsExportProvider } from "./ExportContext";
import TrendStrip from "./TrendStrip";
import DurationTrendPanel from "./DurationTrendPanel";


import { ExpandMore } from "@mui/icons-material";

import type { InsightsView } from "@/hooks/useInsightsView";
import type { RangePreset } from "@helpers/insightsSearch";
import { Subject, resolveSubject } from "@helpers/insightsSubjects";
import {
	isInsightsPanelShown as shown,
	isInsightsSectionShown,
} from "@helpers/featureFlags";
import type { InsightsPanel, InsightsSection } from "@helpers/insightsSelection";
import DateLocalizationProvider from "@components/DateLocalization/DateLocalizationProvider";
import PanelRow, { PanelGrid } from "./PanelRow";

// Lazily mounted as one, so one is enough to mount it
const GAPS_TOGETHER: readonly InsightsPanel[] = [
	"gaps.unmetLocal",
	"gaps.acquisitionOpportunities",
	"gaps.consortialLifeline",
	"gaps.newAcquisitions",
];

const RANGE_PRESETS: RangePreset[] = ["7d", "30d", "90d", "365d"];

/**
 * One subject's worth of panels, under a heading that names it.
 *
 * Returning null rather than hiding with CSS is the point: a subject that is not open must
 * not mount its panels, or the cost the subjects exist to make opt-in is paid anyway - and
 * the lazy panels below the fold would sit on an IntersectionObserver a hidden element
 * never fires.
 */
function Section({
	id,
	titleKey,
	section,
	current,
	children,
}: {
	id: string;
	titleKey: string;
	/** The subject this section is, or the overview above every subject. */
	section: InsightsSection;
	current: Subject;
	children: ReactNode;
}) {
	const { t } = useTranslation();

	if (section !== "overview" && section !== current) return null;
	if (!isInsightsSectionShown(section)) return null;

	return (
		<Box component="section" aria-labelledby={id}>
			<Typography id={id} variant="h5" component="h2" gutterBottom>
				{t(titleKey)}
			</Typography>
			<Stack spacing={3}>{children}</Stack>
		</Box>
	);
}

// From above To on a phone: side by side, the pair is wider than a 320px screen
function StackedRangeField(props: MultiInputDateRangeFieldProps) {
	return (
		<MultiInputDateRangeField
			{...props}
			direction={{ xs: "column", sm: "row" }}
			sx={[{ maxWidth: "100%" }, ...(Array.isArray(props.sx) ? props.sx : [props.sx])]}
		/>
	);
}

export default function InsightsDashboard({
	libraryCode,
	view,
}: {
	// One of the signed-in user's own libraries, from the access token's agency
	// claim; this app has no consortium-wide scope.
	libraryCode: string;
	/** The view as the URL states it, and the writers that change it. */
	view: InsightsView;
}) {
	const { t } = useTranslation();
	const announce = useAnnounce();
	const client = useDcbRestClient();
	const { categorical } = useChartPalette();

	// A subject this app does not offer - an old link, one copied from DCB Admin - falls
	// back rather than rendering nothing.
	const subject = resolveSubject(view.tab);

	const { range: rangePreset, custom: customRange } = view;
	const setRangePreset = view.setRange;
	const setCustomRange = view.setCustomRange;

	const { params, interval } = useMemo(() => {
		const { window: span, interval } = statsWindow(rangePreset, customRange);
		return { params: { libraryCode, ...span } as StatsParams, interval };
	}, [rangePreset, customRange, libraryCode]);

	const window = customRange
		? `${formatDate(localDay(customRange.startDate))} – ${formatDate(
				localDay(customRange.endDate),
			)}`
		: t(`insights.range.${rangePreset}`);

	// Changing the range rewrites every panel below it, and a screen-reader user was
	// told none of that - WCAG 2.2 SC 4.1.3. Announced on the settled view: only a
	// complete, valid range reaches the URL (the onChange below).
	const announcement = t("insights.announce.view", { range: window });
	useEffect(() => {
		announce(announcement);
	}, [announcement, announce]);

	// What every exported file says about itself, from the same words the live region uses -
	// so a file and the announcement cannot disagree about what is on screen. The scope is
	// fixed here: this app reports on the signed-in user's own library and nothing else.
	const exportContext = {
		scope: t("insights.export.this_library"),
		window,
	};

	// The whole KPI header in ONE round-trip (prior window + all aggregates fanned out
	// server-side). The heavier panels below fetch lazily as they scroll into view.
	const dashboard = useQuery(dashboardQueryOptions(client, params));
	const d = dashboard.data;
	const loading = dashboard.isLoading;

	const currentRate = d
		? fillRate(
				d.fulfillmentCurrent.successfulCount,
				d.fulfillmentCurrent.failedCount,
			)
		: null;
	const priorRate = d
		? fillRate(
				d.fulfillmentPrior.successfulCount,
				d.fulfillmentPrior.failedCount,
			)
		: null;
	// Error rate is the complement of the success/fill rate; a rise is bad.
	const currentErrRate = currentRate != null ? 100 - currentRate : null;
	const priorErrRate = priorRate != null ? 100 - priorRate : null;
	const errDelta =
		currentErrRate != null && priorErrRate != null
			? currentErrRate - priorErrRate
			: null;

	const totalBorrows = d?.lendBorrowTotals.borrowedCount ?? 0;
	const checkoutRate =
		d && d.checkoutRate.totalCount > 0
			? (d.checkoutRate.reachedCount / d.checkoutRate.totalCount) * 100
			: null;

	return (
		<InsightsExportProvider value={exportContext}>
			<Stack spacing={3}>
				<Stack
					direction="row"
					spacing={2}
					sx={{
						// End-aligned, a row too wide for a phone overflowed off its left edge
						justifyContent: { xs: "flex-start", sm: "flex-end" },
						alignItems: "center",
						flexWrap: "wrap",
						rowGap: 1,
					}}
				>
					<Typography variant="body2" color="text.secondary">
						{t("insights.range.label")}
					</Typography>
					<ToggleButtonGroup
						size="small"
						exclusive
						// No preset is highlighted while a custom range is active.
						value={customRange ? null : rangePreset}
						onChange={(_e, value) => value && setRangePreset(value)}
						aria-label={t("insights.range.label")}
					>
						{RANGE_PRESETS.map((preset) => (
							<ToggleButton key={preset} value={preset}>
								{t(`insights.range.${preset}`)}
							</ToggleButton>
						))}
					</ToggleButtonGroup>
					<DateLocalizationProvider>
						<DateRangePicker
							value={
								customRange
									? [dayjs(customRange.startDate), dayjs(customRange.endDate)]
									: [null, null]
							}
							onChange={(value, context) => {
								const [start, end] = value;
								if (!start && !end) {
									setCustomRange(null);
									return;
								}
								// The field publishes each section as it is typed: years 2, 20 and 202 on the way to 2025
								if (!start || !end || context.validationError.some((error) => error !== null)) {
									return;
								}
								// The URL holds calendar days; statsWindow makes them instants.
								setCustomRange({
									startDate: start.format("YYYY-MM-DD"),
									endDate: end.format("YYYY-MM-DD"),
								});
							}}
							disableFuture
							// Two labelled inputs and the same actions as the data grid's date
							// filter, rather than one combined field with neither.
							slots={{ field: StackedRangeField }}
							slotProps={{
								textField: { size: "small" },
								actionBar: { actions: ["clear", "nextOrAccept"] },
							}}
							localeText={{
								start: t("insights.range.from"),
								end: t("insights.range.to"),
							}}
						/>
					</DateLocalizationProvider>
				</Stack>


				<SubjectBar current={subject} />

				{/* The persistent header is NOT a subject: the five figures and the range are the
					context every subject is read against, so they stay above the subject sections
					rather than inside one. */}
				<Section
					id="insights-overview-heading"
					section="overview"
					current={subject}
					titleKey="insights.sections.overview"
				>
					{shown("overview.headline") && <OverviewTiles params={params} />}

					{/* MUI wraps the summary in an <h3> by default, which lands between the page
					<h1> and the panels' <h2>s and skips a level. The heading slot is the
					documented way to say otherwise - caught by the heading-order gate. */}
					{shown("overview.moreFigures") && (
						<Accordion
							variant="outlined"
							disableGutters
							slots={{ heading: "h2" }}
						>
							<AccordionSummary expandIcon={<ExpandMore />}>
								<Typography variant="body2">
									{t("insights.headline.more")}
								</Typography>
							</AccordionSummary>
							<AccordionDetails>
								<Box
									sx={{
										display: "grid",
										gap: 2,
										gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
									}}
								>
									<KpiTile
										title={t("insights.kpi.error_rate.title")}
										metric="error_rate"
										value={
											currentErrRate != null
												? formatPercent(currentErrRate)
												: "—"
										}
										deltaPct={errDelta}
										higherIsBetter={false}
										subtitle={t("insights.kpi.vs_prior")}
										loading={loading}
									/>
									<KpiTile
										title={t("insights.kpi.checkout_rate.title")}
										metric="checkout_rate"
										value={
											checkoutRate != null ? formatPercent(checkoutRate) : "—"
										}
										subtitle={
											d
												? t("insights.kpi.checkout_rate.subtitle", {
														reached: d.checkoutRate.reachedCount,
														total: d.checkoutRate.totalCount,
													})
												: undefined
										}
										loading={loading}
									/>
									<KpiTile
										title={t("insights.kpi.total_borrows.title")}
										value={formatNumber(totalBorrows)}
										subtitle={t("insights.kpi.total_borrows.subtitle")}
										loading={loading}
									/>
									<KpiTile
										title={t("insights.kpi.rescued.title")}
										value={formatNumber(d?.savedByReResolution ?? 0)}
										subtitle={t("insights.kpi.rescued.subtitle")}
										loading={loading}
									/>
									<KpiTile
										title={t("insights.kpi.unique_titles.title")}
										value={formatNumber(
											d?.collectionSummary.uniqueTitlesRequested ?? 0,
										)}
										subtitle={t("insights.kpi.unique_titles.subtitle", {
											total: d?.collectionSummary.totalRequests ?? 0,
										})}
										loading={loading}
									/>
									{/* An assumption multiplied by a count, not a measurement. Beside four
									measured figures it borrowed a confidence it has not earned. */}
									<CostAvoidanceTile
										fulfilled={d?.fulfillmentCurrent.successfulCount ?? 0}
										unitCost={view.unitCost}
										onUnitCostChange={view.setUnitCost}
										loading={loading}
									/>
								</Box>
							</AccordionDetails>
						</Accordion>
					)}
				</Section>

				<Section
					id="insights-trends-heading"
					section="trends"
					current={subject}
					titleKey="insights.sections.trends"
				>
					{/* Direction first: it answers the question the subject is named for, and it
						reads the series the spine below already fetched. */}
					{shown("trends.trendStrip") && <TrendStrip params={params} interval={interval} />}

					{/* The three durations over time. Behind its own flag as well: /insights/trend
						is on no dcb-service release, and a 404 through the panel contract reads as
						a fault rather than as a server that is older. */}
					<PanelRow minHeight={360}>
						{shown("trends.durationTrend") && (
							<DurationTrendPanel params={params} interval={interval} />
						)}
					</PanelRow>

					{/* Trend spine + plot-builder */}
					{shown("trends.statusFlow") && (
						<StatusFlowChart params={params} interval={interval} view={view} />
					)}
				</Section>

				<Section
					id="insights-performance-heading"
					section="service"
					current={subject}
					titleKey="insights.sections.performance"
				>
					{shown("service.durations") && (
						<DurationsPanel
							params={params}
							toLoaned={d?.turnaroundToLoaned}
							loading={loading}
						/>
					)}

					{/* Peer benchmarking - this library vs the consortium median */}
					<PanelRow minHeight={320}>
						{shown("service.peerBenchmark") && (
							<PeerBenchmarkPanel
								params={{ startDate: params.startDate, endDate: params.endDate }}
								libraryCode={libraryCode}
							/>
						)}
					</PanelRow>

					{/* Walk-up versus shipped, so the courier saving is evidence and not a
					    slide. Beside peer benchmarking because both answer "how are we
					    doing" rather than "what happened". */}
					<PanelRow minHeight={320}>
						{shown("service.walkUp") && <WalkUpDiversionPanel params={params} />}
					</PanelRow>

					{/* Operational breakdowns */}
					<PanelRow minHeight={360}>
						{shown("service.failures") && <FailureTaxonomyChart params={params} />}
						{shown("service.supplierReliability") && (
							<SupplierReliabilityChart params={params} />
						)}
					</PanelRow>

					{/* Bottleneck + lender responsiveness */}
					<PanelRow minHeight={360}>
						{shown("service.timeInStatus") && <TimeInStatusChart params={params} />}
						{shown("service.supplierResponse") && (
							<SupplierResponseSlaChart params={params} />
						)}
					</PanelRow>
				</Section>

				<Section
					id="insights-demand-heading"
					section="demand"
					current={subject}
					titleKey="insights.sections.demand"
				>
					{/* Demand pattern (staffing) */}
					<PanelRow minHeight={320}>
						{shown("demand.heatmap") && <DemandHeatmapChart params={params} />}
					</PanelRow>

					{/* Collection analysis: format mix + most-requested titles */}
					<PanelRow minHeight={360}>
						{shown("demand.dimensions") && <CollectionDimensionPanel params={params} />}
						{shown("demand.topTitles") && (
							<TableStatPanel<RequestedTitleStat>
								titleKey="insights.charts.top_titles.title"
								subtitleKey="insights.charts.top_titles.subtitle"
								queryOptions={topRequestedTitlesQueryOptions(client, params)}
								// Titles repeat across editions; the cluster is the work counted
								getRowKey={(r) => r.clusterId ?? r.title}
								columns={[
									{
										headerKey: "insights.charts.top_titles.col_title",
										text: (r) => r.title,
										cell: (r) => r.title ?? "—",
									},
									{
										headerKey: "insights.charts.top_titles.col_requests",
										align: "right",
										text: (r) => r.requestCount,
										cell: (r) => formatNumber(r.requestCount),
									},
								]}
							/>
						)}
					</PanelRow>

					{/* Demand breakdowns: pickup location + patron group */}
					<PanelRow minHeight={360}>
						{shown("demand.byPickupLocation") && (
							<BarStatPanel<PickupLocationDemandStat>
								titleKey="insights.charts.demand_by_pickup.title"
								subtitleKey="insights.charts.demand_by_pickup.subtitle"
								seriesLabelKey="insights.charts.demand_by_pickup.series"
								categoryKey="insights.charts.demand_by_pickup.category"
								queryOptions={demandByPickupLocationQueryOptions(
									client,
									params,
								)}
								getLabel={(r) => r.pickupLocationName ?? r.pickupLocationCode}
								getValue={(r) => r.requestCount}
								color={categorical[0]}
								horizontal
							/>
						)}
						{shown("demand.byPatronGroup") && (
							<BarStatPanel<PatronGroupDemandStat>
								titleKey="insights.charts.demand_by_patron_group.title"
								subtitleKey="insights.charts.demand_by_patron_group.subtitle"
								seriesLabelKey="insights.charts.demand_by_patron_group.series"
								categoryKey="insights.charts.demand_by_patron_group.category"
								queryOptions={demandByPatronGroupQueryOptions(client, params)}
								getLabel={(r) => r.patronGroup}
								getValue={(r) => r.requestCount}
								color={categorical[0]}
								horizontal
							/>
						)}
					</PanelRow>

					{/* Demand no library could supply: the acquisition signal the failure
					    taxonomy cannot give, because these requests never had a supplier. */}
					<PanelRow minHeight={320}>
						{shown("demand.unfillable") && (
							<TableStatPanel<UnfillableDemandStat>
								titleKey="insights.charts.unfillable_demand.title"
								subtitleKey="insights.charts.unfillable_demand.subtitle"
								metric="unfillable_demand"
								queryOptions={unfillableDemandQueryOptions(client, params)}
								getRowKey={(r) => r.clusterId}
								columns={[
									{
										headerKey: "insights.charts.top_titles.col_title",
										text: (r) => r.title,
										cell: (r) => r.title ?? "—",
									},
									{
										headerKey: "insights.charts.rare_gem.col_author",
										text: (r) => r.author,
										cell: (r) => r.author ?? "—",
									},
									{
										headerKey: "insights.charts.top_titles.col_requests",
										align: "right",
										text: (r) => r.requestCount,
										cell: (r) => formatNumber(r.requestCount),
									},
								]}
							/>
						)}
					</PanelRow>
				</Section>

				<Section
					id="insights-partners-heading"
					section="partners"
					current={subject}
					titleKey="insights.sections.partners"
				>
					<PanelRow minHeight={360}>
						{/* Keyed on the range so its page starts over: the old page may not exist in the new one. */}
						{shown("partners.tradingPartners") && (
							<TradingPartnersPanel
								key={`${params.startDate ?? ""}|${params.endDate ?? ""}`}
								params={params}
								libraryCode={libraryCode}
							/>
						)}
					</PanelRow>

					{/* Reciprocity / value */}
					<PanelRow minHeight={360}>
						{shown("partners.netFlow") && <NetFlowChart params={params} />}
					</PanelRow>
				</Section>

				<Section
					id="insights-collection-heading"
					section="collection"
					current={subject}
					titleKey="insights.sections.collection"
				>
					<CollectionAnalysisSection libraryCode={libraryCode} />
				</Section>

				<Section
					id="insights-gaps-heading"
					section="gaps"
					current={subject}
					titleKey="insights.sections.gaps"
				>
					{/* Collection gaps + supply value */}
					{GAPS_TOGETHER.some(shown) && (
						<LazyPanel minHeight={400}>
							<>
								<PanelGrid>
									{shown("gaps.unmetLocal") && (
										<TableStatPanel<TopClusterStat>
											titleKey="insights.charts.unmet_local.title"
											subtitleKey="insights.charts.unmet_local.subtitle"
											queryOptions={unmetLocalDemandQueryOptions(client, {
												...params,
												libraryCode,
											})}
											getRowKey={(r) => r.clusterId}
											columns={[
												{
													headerKey: "insights.charts.top_titles.col_title",
													text: (r) => r.title,
													cell: (r) => r.title ?? "—",
												},
												{
													headerKey: "insights.charts.top_titles.col_requests",
													align: "right",
													text: (r) => r.requestCount,
													cell: (r) => formatNumber(r.requestCount),
												},
											]}
										/>
									)}
									{shown("gaps.acquisitionOpportunities") && (
										<TableStatPanel<TopClusterStat>
											titleKey="insights.charts.acquisition_opportunities.title"
											subtitleKey="insights.charts.acquisition_opportunities.subtitle"
											queryOptions={acquisitionOpportunitiesQueryOptions(client, {
												...params,
												libraryCode,
											})}
											getRowKey={(r) => r.clusterId}
											columns={[
												{
													headerKey: "insights.charts.top_titles.col_title",
													text: (r) => r.title,
													cell: (r) => r.title ?? "—",
												},
												{
													headerKey: "insights.charts.top_titles.col_requests",
													align: "right",
													text: (r) => r.requestCount,
													cell: (r) => formatNumber(r.requestCount),
												},
											]}
										/>
									)}
								</PanelGrid>

								{shown("gaps.consortialLifeline") && (
									<TableStatPanel<ConsortialLifelineStat>
										titleKey="insights.charts.consortial_lifeline.title"
										subtitleKey="insights.charts.consortial_lifeline.subtitle"
										queryOptions={consortialLifelineQueryOptions(client, {
											...params,
											libraryCode,
										})}
										getRowKey={(r) => r.clusterId}
										columns={[
											{
												headerKey: "insights.charts.top_titles.col_title",
												text: (r) => r.title,
												cell: (r) => r.title ?? "—",
											},
											{
												headerKey: "insights.charts.rare_gem.col_author",
												text: (r) => r.author,
												cell: (r) => r.author ?? "—",
											},
											{
												headerKey:
													"insights.charts.consortial_lifeline.col_supplied",
												align: "right",
												text: (r) => r.supplyCount,
												cell: (r) => formatNumber(r.supplyCount),
											},
										]}
									/>
								)}

								{shown("gaps.newAcquisitions") && (
									<NewAcquisitionsPanel params={params} libraryCode={libraryCode} />
								)}
							</>
						</LazyPanel>
					)}

					{/* Unique collection value */}
					<PanelRow minHeight={320}>
						{shown("gaps.rareGems") && <RareGemPanel params={{ ...params, libraryCode }} />}
					</PanelRow>
				</Section>
			</Stack>
		</InsightsExportProvider>
	);
}
