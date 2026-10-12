import { useState } from "react";
import { useTranslation } from "react-i18next";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
	Box,
	Card,
	CardContent,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TablePagination,
	TableRow,
	Typography,
} from "@mui/material";

import { useDcbRestClient } from "@/hooks/useDcbRestClient";
import { StatsParams, topPartnersQueryOptions } from "@helpers/statsApi";
import { formatNumber } from "@helpers/formatters";

import MetricInfo from "./MetricInfo";
import PanelState from "./PanelState";

const PANEL_MIN_HEIGHT = 320;
const PAGE_SIZES = [10, 25, 50];

/**
 * Who this library trades with, in both directions, ranked on the total with the borrow and
 * supply split kept. Paged, because the tail being reachable is the point of top-partners
 * over the fixed top ten in the dashboard metrics.
 */
export default function TradingPartnersPanel({
	params,
	libraryCode,
}: {
	params: StatsParams;
	libraryCode: string;
}) {
	const { t } = useTranslation();
	const client = useDcbRestClient();
	const [page, setPage] = useState(0);
	const [size, setSize] = useState(PAGE_SIZES[0]);

	const { data, isLoading, isError, refetch, isFetching } = useQuery({
		...topPartnersQueryOptions(client, { ...params, libraryCode, page, size }),
		// Otherwise a page change unmounts the table into a spinner and the layout jumps.
		placeholderData: keepPreviousData,
	});

	const rows = data?.content ?? [];
	const title = t("insights.charts.trading_partners.title");

	return (
		<Card variant="outlined">
			<CardContent>
				<Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
					<Typography variant="h6" component="h3">
						{title}
					</Typography>
					<MetricInfo metric="trading_partners" label={title} />
				</Box>
				<Typography variant="body2" color="text.secondary" gutterBottom>
					{t("insights.charts.trading_partners.subtitle")}
				</Typography>
				<PanelState
					isLoading={isLoading}
					isError={isError}
					isEmpty={rows.length === 0}
					onRetry={refetch}
					isRetrying={isFetching}
					height={PANEL_MIN_HEIGHT}
				>
					{() => (
						<>
							<TableContainer sx={{ maxHeight: 420 }}>
								<Table size="small" stickyHeader>
									<TableHead>
										<TableRow>
											<TableCell>
												{t("insights.charts.trading_partners.col_partner")}
											</TableCell>
											<TableCell align="right">
												{t("insights.charts.trading_partners.col_borrowed")}
											</TableCell>
											<TableCell align="right">
												{t("insights.charts.trading_partners.col_supplied")}
											</TableCell>
											<TableCell align="right">
												{t("insights.charts.trading_partners.col_total")}
											</TableCell>
										</TableRow>
									</TableHead>
									<TableBody>
										{rows.map((row) => (
											<TableRow key={row.partnerCode} hover>
												<TableCell>
													{row.partnerName ?? row.partnerCode}
													{row.partnerName ? (
														<Typography
															variant="caption"
															component="span"
															color="text.secondary"
															sx={{ ml: 1 }}
														>
															{row.partnerCode}
														</Typography>
													) : null}
												</TableCell>
												<TableCell align="right">
													{formatNumber(row.borrowedFromCount)}
												</TableCell>
												<TableCell align="right">
													{formatNumber(row.suppliedToCount)}
												</TableCell>
												<TableCell align="right">
													{formatNumber(row.totalCount)}
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</TableContainer>
							<TablePagination
								component="div"
								// totalSize counts PARTNERS, not requests, so it drives this directly.
								count={data?.totalSize ?? 0}
								page={page}
								onPageChange={(_e, next) => setPage(next)}
								rowsPerPage={size}
								rowsPerPageOptions={PAGE_SIZES}
								onRowsPerPageChange={(e) => {
									setSize(parseInt(e.target.value, 10));
									setPage(0);
								}}
								labelRowsPerPage={t(
									"insights.charts.trading_partners.rows_per_page",
								)}
							/>
						</>
					)}
				</PanelState>
			</CardContent>
		</Card>
	);
}
