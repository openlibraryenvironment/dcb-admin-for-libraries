import { useId, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import {
	Alert,
	Box,
	Card,
	CardContent,
	Skeleton,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Typography,
} from "@mui/material";

import { useDcbRestClient } from "@/hooks/useDcbRestClient";
import { libraryBreakdownQueryOptions, StatsParams } from "@helpers/statsApi";

const PANEL_MIN_HEIGHT = 300;

/**
 * How many requests the reader collected in person, and how many travelled — §V-2.5.
 *
 * §V-2.5: the courier saving from walk-up is an assertion until it is counted. This is the
 * count. A request collected at the supplying library moved no van; a shipped one did.
 *
 * The panel deliberately reports VOLUME and not money. `CostAvoidanceTile` beside it already
 * multiplies a fulfilment count by a figure the librarian types in, and inventing a second
 * per-van cost here would be a confident number nobody could source — the same reason
 * dcb-service ships no "traditional ILL cost".
 */
export default function WalkUpDiversionPanel({ params }: { params: StatsParams }) {
	const { t } = useTranslation();
	const client = useDcbRestClient();
	const headingId = useId();

	const { data, isLoading } = useQuery(libraryBreakdownQueryOptions(client, params));

	const rows = useMemo(
		() =>
			(data ?? []).map((row) => ({
				libraryCode: row.libraryCode,
				// A Host LMS code means nothing to most librarians, so lead with the name.
				// Fall back to the code rather than an empty cell when a system has requests
				// but is not onboarded as a library — §N-5's degrade-honestly rule.
				libraryName: row.libraryName ?? row.libraryCode,
				totalRequests: row.totalRequests,
				walkUpRequests: row.walkUpRequests,
				shippedRequests: row.shippedRequests,
				walkUpShare:
					row.totalRequests > 0
						? (row.walkUpRequests / row.totalRequests) * 100
						: null,
			})),
		[data],
	);

	const anyWalkUp = rows.some((row) => row.walkUpRequests > 0);

	return (
		// A NAMED region, not a bare card. This page carries nineteen panels and several
		// render the same library codes, so "unnamed-lms" appears in two tables; without a
		// name on the section a screen-reader user meets the second table with no idea which
		// question it answers, and a reader of either cannot tell them apart.
		<Card variant="outlined" component="section" aria-labelledby={headingId}>
			<CardContent sx={{ minHeight: PANEL_MIN_HEIGHT }}>
				<Typography variant="h6" id={headingId} gutterBottom>
					{t("insights.walk_up.title")}
				</Typography>
				<Typography variant="body2" color="text.secondary" gutterBottom>
					{t("insights.walk_up.explainer")}
				</Typography>

				{isLoading ? (
					// Matched to the table it replaces: layout shift is the one metric a
					// reviewer cannot see in a diff.
					<Skeleton variant="rounded" height={PANEL_MIN_HEIGHT - 80} />
				) : rows.length === 0 ? (
					<Typography color="text.secondary">
						{t("insights.walk_up.no_requests")}
					</Typography>
				) : (
					<Box>
						{/* Zero walk-ups is a real and common answer while walk-up is not
						    switched on, and a table of zeroes reads as a broken panel. Saying
						    so is the difference between "no data" and "nothing yet". */}
						{!anyWalkUp && (
							<Alert severity="info" sx={{ mb: 2 }}>
								{t("insights.walk_up.none_yet")}
							</Alert>
						)}

						<TableContainer sx={{ overflowX: "auto" }}>
							<Table size="small">
								<TableHead>
									<TableRow>
										<TableCell>{t("insights.walk_up.library")}</TableCell>
										<TableCell align="right">
											{t("insights.walk_up.total")}
										</TableCell>
										<TableCell align="right">
											{t("insights.walk_up.collected")}
										</TableCell>
										<TableCell align="right">
											{t("insights.walk_up.shipped")}
										</TableCell>
										<TableCell align="right">
											{t("insights.walk_up.share")}
										</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{rows.map((row) => (
										<TableRow key={row.libraryCode}>
											<TableCell component="th" scope="row">
												{row.libraryName}
											</TableCell>
											<TableCell align="right">
												{row.totalRequests.toLocaleString()}
											</TableCell>
											<TableCell align="right">
												{row.walkUpRequests.toLocaleString()}
											</TableCell>
											<TableCell align="right">
												{row.shippedRequests.toLocaleString()}
											</TableCell>
											<TableCell align="right">
												{/* An em dash, not 0%. A library with no requests has
												    no share, and printing zero would read as "nobody
												    walks up here" rather than "nothing to divide by". */}
												{row.walkUpShare == null
													? "—"
													: `${row.walkUpShare.toFixed(1)}%`}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</TableContainer>
					</Box>
				)}
			</CardContent>
		</Card>
	);
}
