import { useMemo, type ReactNode } from "react";
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
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DateRangePicker } from "@mui/x-date-pickers-pro";
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
  acquisitionOpportunitiesQueryOptions,
  consortialLifelineQueryOptions,
  dashboardQueryOptions,
  demandByPatronGroupQueryOptions,
  demandByPickupLocationQueryOptions,
  netFlowQueryOptions,
  supplierResponseSlaQueryOptions,
  topRequestedTitlesQueryOptions,
  unmetLocalDemandQueryOptions,
} from "@helpers/statsApi";
import {
  rangeToParams,
  intervalForRange,
  intervalForSpan,
  formatTurnaround,
} from "@helpers/insightsRange";

import KpiTile from "./KpiTile";
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
import CollectionDimensionPanel from "./CollectionDimensionPanel";
import NewAcquisitionsPanel from "./NewAcquisitionsPanel";
import SubjectBar from "./SubjectBar";
import { InsightsExportProvider } from "./ExportContext";
import TrendStrip from "./TrendStrip";
import DurationTrendPanel from "./DurationTrendPanel";

import { visuallyHidden } from "@mui/utils";

import { ExpandMore } from "@mui/icons-material";

import type { InsightsView } from "@/hooks/useInsightsView";
import type { RangePreset } from "@helpers/insightsSearch";
import { Subject, resolveSubject } from "@helpers/insightsSubjects";
import { isInsightsTrendsEnabled } from "@helpers/featureFlags";

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
  subject,
  current,
  children,
}: {
  id: string;
  titleKey: string;
  /** Which subject this section belongs to; omitted means always shown. */
  subject?: Subject;
  current: Subject;
  children: ReactNode;
}) {
  const { t } = useTranslation();

  if (subject && subject !== current) return null;

  return (
    <Box component="section" aria-labelledby={id}>
      <Typography id={id} variant="h5" component="h2" gutterBottom>
        {t(titleKey)}
      </Typography>
      <Stack spacing={3}>{children}</Stack>
    </Box>
  );
}

function fillRate(successful: number, failed: number): number | null {
  const total = successful + failed;
  return total === 0 ? null : (successful / total) * 100;
}

export default function InsightsDashboard({
  libraryCode,
  view,
}: {
  // Always the signed-in user's own library. This app has no consortium-wide
  // scope and no library picker: the code is derived from the access token's
  // agency claim by the route, never chosen in the UI.
  libraryCode: string;
  /** The view as the URL states it, and the writers that change it. */
  view: InsightsView;
}) {
  const { t } = useTranslation();
  const client = useDcbRestClient();
  const { categorical } = useChartPalette();

  // A subject this app does not offer - an old link, one copied from DCB Admin - falls
  // back rather than rendering nothing.
  const subject = resolveSubject(view.tab);

  const { range: rangePreset, custom: customRange } = view;
  const setRangePreset = view.setRange;
  const setCustomRange = view.setCustomRange;

  const { params, interval } = useMemo(() => {
    // An explicit custom window wins over the preset.
    const current = customRange ?? rangeToParams(rangePreset);
    return {
      params: { libraryCode, ...current } as StatsParams,
      interval: customRange
        ? intervalForSpan(current.startDate, current.endDate)
        : intervalForRange(rangePreset),
    };
  }, [rangePreset, customRange, libraryCode]);

  // Scope never changes here - this app is one library - so the range is the whole of
  // what moved.
  // Both are one row for this app: it reports on one library, so the supplier-side SLA
  // and the net-flow row are its own. The durations panel asks for the same two keys, and
  // the query cache serves both from one request each.
  const myResponse = useQuery(supplierResponseSlaQueryOptions(client, params));
  const netFlow = useQuery(netFlowQueryOptions(client, params));

  const netRow = netFlow.data?.[0];
  const netBalance = netRow
    ? netRow.suppliedCount - netRow.borrowedCount
    : null;

  const window = customRange
    ? `${dayjs(customRange.startDate).format("D MMM YYYY")} - ${dayjs(
        customRange.endDate,
      ).format("D MMM YYYY")}`
    : t(`insights.range.${rangePreset}`);

  const announcement = t("insights.announce.view", { range: window });

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
  const rateDelta =
    currentRate != null && priorRate != null ? currentRate - priorRate : null;

  // Error rate is the complement of the success/fill rate; a rise is bad.
  const currentErrRate = currentRate != null ? 100 - currentRate : null;
  const priorErrRate = priorRate != null ? 100 - priorRate : null;
  const errDelta =
    currentErrRate != null && priorErrRate != null
      ? currentErrRate - priorErrRate
      : null;

  const resolved = d
    ? d.fulfillmentCurrent.successfulCount + d.fulfillmentCurrent.failedCount
    : 0;
  const totalBorrows = d?.lendBorrowTotals.borrowedCount ?? 0;
  const totalLends = d?.lendBorrowTotals.suppliedCount ?? 0;
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
            justifyContent: "flex-end",
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
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DateRangePicker
              value={
                customRange
                  ? [dayjs(customRange.startDate), dayjs(customRange.endDate)]
                  : [null, null]
              }
              onChange={(value) => {
                const [start, end] = value;
                if (start && end) {
                  setCustomRange({
                    startDate: start.startOf("day").toISOString(),
                    endDate: end.endOf("day").toISOString(),
                  });
                } else if (!start && !end) {
                  setCustomRange(null);
                }
              }}
              disableFuture
              slotProps={{ textField: { size: "small" } }}
              localeText={{
                start: t("insights.range.from"),
                end: t("insights.range.to"),
              }}
            />
          </LocalizationProvider>
        </Stack>

        {/* Changing the range rewrites every panel below it, and a screen-reader user
			    was told none of that - WCAG 2.2 SC 4.1.3. One announcement for the settled
			    view: the control only emits when the choice is complete, so there is
			    nothing to debounce. Keyed on the text so the region speaks again. */}
        <Box
          key={announcement}
          aria-live="polite"
          aria-atomic="true"
          sx={visuallyHidden}
        >
          {announcement}
        </Box>

        <SubjectBar current={subject} />

        {/* The persistent header is NOT a subject: the five figures and the range are the
          context every subject is read against, so they stay above the subject sections
          rather than inside one. */}
        <Section
          id="insights-overview-heading"
          current={subject}
          titleKey="insights.sections.overview"
        >
          {/* KPI row - auto-fit so the tile count can flex. */}
          {/* THE FIVE a library director asks: were my patrons served, and am I carrying
          my share. Ten equal tiles was an index, not a summary - and error rate is the
          complement of the fill rate now shown beside the request count, so it moves
          below with the rest rather than saying the same thing twice.
          INSIGHTS_IA_AND_UX_PLAN.md section 3.3. */}
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
              value={resolved.toLocaleString()}
              subtitle={
                currentRate != null
                  ? t("insights.headline.filled", {
                      rate: currentRate.toFixed(1),
                    })
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
              value={totalLends.toLocaleString()}
              subtitle={t("insights.kpi.total_lends.subtitle")}
              loading={loading}
            />
            <KpiTile
              title={t("insights.headline.my_response")}
              metric="supplier_response"
              value={formatTurnaround(
                myResponse.data?.[0]?.medianResponseSeconds,
                t,
              )}
              subtitle={t("insights.headline.my_response_sub")}
              loading={myResponse.isLoading}
            />
            <KpiTile
              title={t("insights.headline.net_flow")}
              metric="net_flow"
              value={
                netBalance == null
                  ? "—"
                  : `${netBalance > 0 ? "+" : ""}${netBalance.toLocaleString()}`
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

          {/* MUI wraps the summary in an <h3> by default, which lands between the page
          <h1> and the panels' <h2>s and skips a level. The heading slot is the
          documented way to say otherwise - caught by the heading-order gate. */}
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
                      ? `${currentErrRate.toFixed(1)}%`
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
                    checkoutRate != null ? `${checkoutRate.toFixed(1)}%` : "—"
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
                  value={totalBorrows.toLocaleString()}
                  subtitle={t("insights.kpi.total_borrows.subtitle")}
                  loading={loading}
                />
                <KpiTile
                  title={t("insights.kpi.rescued.title")}
                  value={(d?.savedByReResolution ?? 0).toLocaleString()}
                  subtitle={t("insights.kpi.rescued.subtitle")}
                  loading={loading}
                />
                <KpiTile
                  title={t("insights.kpi.unique_titles.title")}
                  value={(
                    d?.collectionSummary.uniqueTitlesRequested ?? 0
                  ).toLocaleString()}
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
        </Section>

        <Section
          id="insights-trends-heading"
          subject="trends"
          current={subject}
          titleKey="insights.sections.trends"
        >
          {/* Direction first: it answers the question the subject is named for, and it
            reads the series the spine below already fetched. */}
          <TrendStrip params={params} interval={interval} />

          {/* The three durations over time. Behind its own flag: /insights/trend is on no
            dcb-service release, and a 404 through the panel contract reads as a fault
            rather than as a server that is older. */}
          {isInsightsTrendsEnabled() ? (
            <LazyPanel minHeight={360}>
              <DurationTrendPanel params={params} interval={interval} />
            </LazyPanel>
          ) : null}

          {/* Trend spine + plot-builder */}
          <StatusFlowChart params={params} interval={interval} view={view} />
        </Section>

        <Section
          id="insights-performance-heading"
          subject="service"
          current={subject}
          titleKey="insights.sections.performance"
        >
          <DurationsPanel
            params={params}
            toLoaned={d?.turnaroundToLoaned}
            loading={loading}
          />

          {/* Peer benchmarking - this library vs the consortium median */}
          <LazyPanel minHeight={320}>
            <PeerBenchmarkPanel
              params={{ startDate: params.startDate, endDate: params.endDate }}
              libraryCode={libraryCode}
            />
          </LazyPanel>

          {/* Operational breakdowns */}
          <LazyPanel minHeight={360}>
            <Box
              sx={{
                display: "grid",
                gap: 3,
                gridTemplateColumns: { xs: "1fr", lg: "repeat(2, 1fr)" },
              }}
            >
              <FailureTaxonomyChart params={params} />
              <SupplierReliabilityChart params={params} />
            </Box>
          </LazyPanel>

          {/* Bottleneck + lender responsiveness */}
          <LazyPanel minHeight={360}>
            <Box
              sx={{
                display: "grid",
                gap: 3,
                gridTemplateColumns: { xs: "1fr", lg: "repeat(2, 1fr)" },
              }}
            >
              <TimeInStatusChart params={params} />
              <SupplierResponseSlaChart params={params} />
            </Box>
          </LazyPanel>
        </Section>

        <Section
          id="insights-demand-heading"
          subject="demand"
          current={subject}
          titleKey="insights.sections.demand"
        >
          {/* Demand pattern (staffing) */}
          <LazyPanel minHeight={320}>
            <DemandHeatmapChart params={params} />
          </LazyPanel>

          {/* Collection analysis: format mix + most-requested titles */}
          <LazyPanel minHeight={360}>
            <Box
              sx={{
                display: "grid",
                gap: 3,
                gridTemplateColumns: { xs: "1fr", lg: "repeat(2, 1fr)" },
              }}
            >
              <CollectionDimensionPanel params={params} />
              <TableStatPanel<RequestedTitleStat>
                titleKey="insights.charts.top_titles.title"
                subtitleKey="insights.charts.top_titles.subtitle"
                queryOptions={topRequestedTitlesQueryOptions(client, params)}
                getRowKey={(r) => r.title}
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
                    cell: (r) => r.requestCount,
                  },
                ]}
              />
            </Box>
          </LazyPanel>

          {/* Demand breakdowns: pickup location + patron group */}
          <LazyPanel minHeight={360}>
            <Box
              sx={{
                display: "grid",
                gap: 3,
                gridTemplateColumns: { xs: "1fr", lg: "repeat(2, 1fr)" },
              }}
            >
              <BarStatPanel<PickupLocationDemandStat>
                titleKey="insights.charts.demand_by_pickup.title"
                subtitleKey="insights.charts.demand_by_pickup.subtitle"
                seriesLabelKey="insights.charts.demand_by_pickup.series"
                queryOptions={demandByPickupLocationQueryOptions(
                  client,
                  params,
                )}
                getLabel={(r) => r.pickupLocationName ?? r.pickupLocationCode}
                getValue={(r) => r.requestCount}
                color={categorical[0]}
                horizontal
              />
              <BarStatPanel<PatronGroupDemandStat>
                titleKey="insights.charts.demand_by_patron_group.title"
                subtitleKey="insights.charts.demand_by_patron_group.subtitle"
                seriesLabelKey="insights.charts.demand_by_patron_group.series"
                queryOptions={demandByPatronGroupQueryOptions(client, params)}
                getLabel={(r) => r.patronGroup}
                getValue={(r) => r.requestCount}
                color={categorical[0]}
                horizontal
              />
            </Box>
          </LazyPanel>
        </Section>

        <Section
          id="insights-partners-heading"
          subject="partners"
          current={subject}
          titleKey="insights.sections.partners"
        >
          {/* Reciprocity / value */}
          <LazyPanel minHeight={360}>
            <NetFlowChart params={params} />
          </LazyPanel>
        </Section>

        <Section
          id="insights-gaps-heading"
          subject="gaps"
          current={subject}
          titleKey="insights.sections.gaps"
        >
          {/* Collection gaps + supply value */}
          <LazyPanel minHeight={400}>
            <>
              <Box
                sx={{
                  display: "grid",
                  gap: 3,
                  gridTemplateColumns: { xs: "1fr", lg: "repeat(2, 1fr)" },
                }}
              >
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
                      cell: (r) => r.requestCount,
                    },
                  ]}
                />
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
                      cell: (r) => r.requestCount,
                    },
                  ]}
                />
              </Box>

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
                    cell: (r) => r.supplyCount,
                  },
                ]}
              />

              <NewAcquisitionsPanel params={params} libraryCode={libraryCode} />
            </>
          </LazyPanel>

          {/* Unique collection value */}
          <LazyPanel minHeight={320}>
            <RareGemPanel params={{ ...params, libraryCode }} />
          </LazyPanel>
        </Section>
      </Stack>
    </InsightsExportProvider>
  );
}
