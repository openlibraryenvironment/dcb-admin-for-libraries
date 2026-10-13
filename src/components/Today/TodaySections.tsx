import { useId } from "react";
import { useTranslation } from "react-i18next";
import { Box, Paper, Skeleton, Typography } from "@mui/material";

import { CustomLink } from "@components/CustomLink";
import { formatNumber } from "@helpers/formatters";
import {
	TODAY_COUNTS,
	TODAY_WINDOW_HOURS,
	type TodayCount,
	type TodayCountId,
	type TodayCounts,
	type TodaySection,
	type TodayWindowKind,
} from "@helpers/today";
import { TILE_MIN_HEIGHT } from "./layout";

const SECTIONS: readonly TodaySection[] = ["waiting", "problems", "activity"];

const GRID_FOR = {
	borrowed: "/patronRequests",
	supplied: "/supplierRequests",
} as const;

const sectionHeading = (
	t: (key: string, options?: Record<string, unknown>) => string,
	section: TodaySection,
	windowKind: TodayWindowKind,
) =>
	section === "waiting"
		? t("today.sections.waiting")
		: t(`today.sections.${section}_${windowKind}`, { count: TODAY_WINDOW_HOURS });

export default function TodaySections({
	data,
	lastWeek,
	windowKind,
}: {
	data: TodayCounts | undefined;
	/** The same counts a week earlier; absent when the comparison is off or not loaded. */
	lastWeek?: Partial<Record<TodayCountId, number | null>>;
	windowKind: TodayWindowKind;
}) {
	return (
		<>
			{SECTIONS.map((section) => (
				<SectionList
					key={section}
					section={section}
					data={data}
					lastWeek={lastWeek}
					windowKind={windowKind}
				/>
			))}
		</>
	);
}

function SectionList({
	section,
	data,
	lastWeek,
	windowKind,
}: {
	section: TodaySection;
	data: TodayCounts | undefined;
	lastWeek?: Partial<Record<TodayCountId, number | null>>;
	windowKind: TodayWindowKind;
}) {
	const { t } = useTranslation();
	const headingId = useId();

	return (
		<Box component="section" aria-labelledby={headingId}>
			<Typography variant="h2" id={headingId} gutterBottom>
				{sectionHeading(t, section, windowKind)}
			</Typography>
			<TileList>
				{TODAY_COUNTS.filter((count) => count.section === section).map((count) => (
					<Box component="li" key={count.id}>
						<Paper
							variant="outlined"
							sx={{ p: 2, minHeight: TILE_MIN_HEIGHT, height: "100%" }}
						>
							<TodayTile count={count} data={data} />
							{lastWeek && count.section !== "waiting" ? (
								<Comparison
									now={data?.counts[count.id] ?? null}
									before={lastWeek[count.id]}
								/>
							) : null}
						</Paper>
					</Box>
				))}
			</TileList>
		</Box>
	);
}

export function TileList({ children }: { children: React.ReactNode }) {
	return (
		<Box
			component="ul"
			// Safari drops list semantics from a list with list-style: none
			role="list"
			sx={{
				listStyle: "none",
				p: 0,
				m: 0,
				display: "grid",
				gap: 2,
				gridTemplateColumns: {
					xs: "1fr",
					sm: "repeat(2, 1fr)",
					md: "repeat(4, 1fr)",
				},
			}}
		>
			{children}
		</Box>
	);
}

export const Figure = ({ value }: { value: number | null }) => (
	<Typography variant="h4" component="span" sx={{ display: "block" }}>
		{value === null ? <span aria-hidden="true">—</span> : formatNumber(value)}
	</Typography>
);

/** The size of a figure and a two-line label, so a loaded tile does not move what follows. */
export const TileSkeleton = () => (
	<>
		<Skeleton sx={{ typography: "h4", width: "30%" }} />
		<Skeleton variant="text" width="90%" />
		<Skeleton variant="text" width="60%" />
	</>
);

function TodayTile({
	count,
	data,
}: {
	count: TodayCount;
	data: TodayCounts | undefined;
}) {
	const { t } = useTranslation();

	if (!data) return <TileSkeleton />;

	const value = data.counts[count.id];

	// An unknown is said in words, never as 0
	if (value === null) {
		return (
			<>
				<Figure value={null} />
				<Typography component="span">
					{t("today.unknown", { label: t(`today.counts.${count.id}`, { count: 2 }) })}
				</Typography>
			</>
		);
	}
	const label = t(`today.counts.${count.id}`, { count: value });
	// A zero would open an empty grid
	if (value === 0) {
		return (
			<>
				<Figure value={0} />
				<Typography component="span">{label}</Typography>
			</>
		);
	}
	return (
		<CustomLink
			to={GRID_FOR[count.scope]}
			search={{ filters: count.filters({ from: data.since, to: data.until }) }}
			// Not colour alone: beside it, a 0 or an unknown is the same tile without a link
			underline="always"
			sx={{ display: "block" }}
		>
			<Figure value={value} />
			<Typography component="span">{label}</Typography>
		</CustomLink>
	);
}

/** In words, not only an arrow or a colour: "3 more than the same time last week". */
function Comparison({
	now,
	before,
}: {
	now: number | null;
	/** undefined while last week is still loading: the line's space is held for it. */
	before: number | null | undefined;
}) {
	const { t } = useTranslation();
	if (before === undefined) {
		return (
			<Typography variant="body2" sx={{ mt: 0.5 }} aria-hidden="true">
				&nbsp;
			</Typography>
		);
	}
	if (now === null || before === null) return null;

	const difference = now - before;
	const text =
		difference === 0
			? t("today.compare.same")
			: t(difference > 0 ? "today.compare.more" : "today.compare.fewer", {
					count: Math.abs(difference),
					value: formatNumber(Math.abs(difference)),
				});

	return (
		<Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
			{text}
		</Typography>
	);
}
