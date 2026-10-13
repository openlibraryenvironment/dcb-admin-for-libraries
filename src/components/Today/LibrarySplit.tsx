import { useId, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQueries, useQuery } from "@tanstack/react-query";
import {
	Box,
	Skeleton,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Typography,
} from "@mui/material";

import { formatNumber } from "@helpers/formatters";
import {
	borrowedByLibraryQuery,
	suppliedByLibraryQuery,
} from "@helpers/patronRequestScope";
import { libraryNamesQueryOptions } from "@helpers/libraryNamesQuery";
import { TODAY_COUNTS, todayCountsQueryOptions } from "@helpers/today";

// One request of nine counts per library, all at once: a shared system's handful, never a consortium
const MAX_SPLIT_LIBRARIES = 10;

/** Each of a multi-library user's libraries, over the same window as the page above it. */
export default function LibrarySplit({
	apiBase,
	agencyCodes,
	since,
}: {
	apiBase: string;
	agencyCodes: string[];
	since: string;
}) {
	const { t } = useTranslation();
	const headingId = useId();
	const shown = agencyCodes.slice(0, MAX_SPLIT_LIBRARIES);

	const names = useQuery(libraryNamesQueryOptions(apiBase, agencyCodes));
	const nameFor = useMemo(() => {
		const map = new Map<string, string>();
		for (const library of names.data?.libraries?.content ?? []) {
			if (library?.agencyCode) map.set(library.agencyCode, library.fullName);
		}
		return map;
	}, [names.data]);

	const rows = useQueries({
		queries: shown.map((code) =>
			todayCountsQueryOptions(
				apiBase,
				{
					borrowed: borrowedByLibraryQuery(code, undefined),
					supplied: suppliedByLibraryQuery(code),
				},
				since,
			),
		),
	});

	return (
		<Box component="section" aria-labelledby={headingId}>
			<Typography variant="h2" id={headingId} gutterBottom>
				{t("today.split.title")}
			</Typography>
			<Typography gutterBottom>{t("today.split.description")}</Typography>
			<TableContainer>
				<Table size="small" aria-labelledby={headingId}>
					<TableHead>
						<TableRow>
							<TableCell>{t("today.split.library")}</TableCell>
							{TODAY_COUNTS.map((count) => (
								<TableCell key={count.id} align="right">
									{t(`today.split.columns.${count.id}`)}
								</TableCell>
							))}
						</TableRow>
					</TableHead>
					<TableBody>
						{shown.map((code, index) => {
							const row = rows[index];
							return (
								<TableRow key={code}>
									<TableCell component="th" scope="row">
										{nameFor.get(code) ?? code}
									</TableCell>
									{TODAY_COUNTS.map((count) => (
										<TableCell key={count.id} align="right">
											{row.isError ? (
												t("today.split.failed")
											) : row.data ? (
												row.data.counts[count.id] === null ? (
													"—"
												) : (
													formatNumber(row.data.counts[count.id]!)
												)
											) : (
												<Skeleton variant="text" width={24} sx={{ ml: "auto" }} />
											)}
										</TableCell>
									))}
								</TableRow>
							);
						})}
					</TableBody>
				</Table>
			</TableContainer>
			{agencyCodes.length > shown.length ? (
				<Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
					{t("today.split.more", { count: agencyCodes.length - shown.length })}
				</Typography>
			) : null}
		</Box>
	);
}
