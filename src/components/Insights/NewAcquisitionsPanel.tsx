import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import {
	Card,
	CardContent,
	Typography,
	Box,
	Stack,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableRow,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers";
import dayjs, { Dayjs } from "dayjs";

import { useDcbRestClient } from "@/hooks/useDcbRestClient";
import { newAcquisitionsQueryOptions, StatsParams } from "@helpers/statsApi";

import PanelState from "./PanelState";
import DateLocalizationProvider from "@components/DateLocalization/DateLocalizationProvider";
import ScrollableTableContainer from "./ScrollableTableContainer";

const PANEL_MIN_HEIGHT = 280;

const aYearAgo = () => dayjs().subtract(1, "year").startOf("day");

// How newly-acquired titles are performing in the network. Library scope (the endpoint
// needs a libraryCode) and driven by an "acquired since" date the user picks.
export default function NewAcquisitionsPanel({
	params,
	libraryCode,
}: {
	params: StatsParams;
	libraryCode: string;
}) {
	const { t } = useTranslation();
	const headingId = useId();
	const client = useDcbRestClient();
	const [typed, setTyped] = useState<Dayjs | null>(aYearAgo);
	// The last real date: the field publishes an Invalid Date for an impossible day, and toISOString throws on one
	const [acquiredSince, setAcquiredSince] = useState<Dayjs>(aYearAgo);

	const { data, isLoading, isError, refetch, isFetching } = useQuery(
		newAcquisitionsQueryOptions(client, {
			...params,
			libraryCode,
			acquiredSince: acquiredSince.toISOString(),
		}),
	);

	const rows = data ?? [];

	return (
		<Card variant="outlined">
			<CardContent>
				<Stack
					direction="row"
					spacing={2}
					sx={{ justifyContent: "space-between", alignItems: "flex-start" }}
				>
					<Box>
						<Typography variant="h6" component="h3" id={headingId} gutterBottom>
							{t("insights.charts.new_acquisitions.title")}
						</Typography>
						<Typography variant="body2" color="text.secondary" gutterBottom>
							{t("insights.charts.new_acquisitions.subtitle")}
						</Typography>
					</Box>
					<DateLocalizationProvider>
						<DatePicker
							label={t("insights.charts.new_acquisitions.acquired_since")}
							value={typed}
							onChange={(value) => {
								setTyped(value);
								if (value?.isValid()) setAcquiredSince(value.startOf("day"));
							}}
							slotProps={{ textField: { size: "small" } }}
							disableFuture
						/>
					</DateLocalizationProvider>
				</Stack>

				<PanelState
					isLoading={isLoading}
					isError={isError}
					isEmpty={rows.length === 0}
					onRetry={refetch}
					isRetrying={isFetching}
					height={PANEL_MIN_HEIGHT}
				>
					{() => (
						<ScrollableTableContainer labelledBy={headingId} sx={{ maxHeight: 420 }}>
							<Table size="small" stickyHeader>
								<TableHead>
									<TableRow>
										<TableCell>
											{t("insights.charts.top_titles.col_title")}
										</TableCell>
										<TableCell>
											{t("insights.charts.rare_gem.col_author")}
										</TableCell>
										<TableCell align="right">
											{t("insights.charts.new_acquisitions.col_supplied")}
										</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{rows.map((row) => (
										<TableRow key={row.clusterId} hover>
											<TableCell>{row.title ?? "—"}</TableCell>
											<TableCell>{row.author ?? "—"}</TableCell>
											<TableCell align="right">{row.supplyCount}</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</ScrollableTableContainer>
					)}
				</PanelState>
			</CardContent>
		</Card>
	);
}
