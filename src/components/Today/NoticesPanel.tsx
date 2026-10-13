import { useId } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Alert, Box, Paper, Skeleton, Typography } from "@mui/material";

import { CustomLink } from "@components/CustomLink";
import { announcementsQueryOptions, isLive } from "@helpers/announcements";
import { formatDate } from "@helpers/formatters";

// The panel is a reminder of what patrons see, not the list: that is on the announcements page
const SHOWN = 3;

export default function NoticesPanel({
	apiBase,
	libraryId,
}: {
	apiBase: string;
	libraryId: string;
}) {
	const { t } = useTranslation();
	const headingId = useId();
	const announcements = useQuery(announcementsQueryOptions(apiBase, libraryId));

	const live = (announcements.data?.announcements ?? []).filter((row) => isLive(row));

	return (
		<Paper component="section" variant="outlined" aria-labelledby={headingId} sx={{ p: 2 }}>
			<Typography variant="h2" id={headingId} gutterBottom>
				{t("today.notices.title")}
			</Typography>
			{announcements.isError ? (
				<Alert severity="error">{t("today.notices.load_failed")}</Alert>
			) : !announcements.data ? (
				<Skeleton variant="text" width="60%" />
			) : live.length === 0 ? (
				<Typography>{t("today.notices.none")}</Typography>
			) : (
				<>
					<Typography gutterBottom>
						{t("today.notices.live", { count: live.length })}
					</Typography>
					<Box component="ul" sx={{ pl: 3, my: 0 }}>
						{live.slice(0, SHOWN).map((row) => (
							<li key={row.id}>
								<Typography component="span">
									{row.headline}
									{" — "}
									{t("today.notices.until", { date: formatDate(row.expiresAt) })}
								</Typography>
							</li>
						))}
					</Box>
				</>
			)}
			<Typography sx={{ mt: 1 }}>
				<CustomLink to="/announcements">{t("today.notices.manage")}</CustomLink>
			</Typography>
		</Paper>
	);
}
