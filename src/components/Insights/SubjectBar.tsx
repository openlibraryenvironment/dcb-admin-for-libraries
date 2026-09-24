import { useTranslation } from "react-i18next";
import { Box } from "@mui/material";

import { CustomLink } from "@components/CustomLink";
import { SUBJECTS, Subject } from "@helpers/insightsSubjects";
import { SUBJECT_BAR_HEIGHT, SUBJECT_BAR_TOP } from "@helpers/stickyOffsets";

/**
 * The five subjects, as links rather than tabs: the layout already owns the application's
 * tab strip, and a second tablist inside the panel of the first gives a keyboard user two
 * sets of arrow keys with no way to tell which has focus.
 *
 * Why subjects at all, and which panels each holds: INSIGHTS_IA_AND_UX_PLAN.md section 1.3.
 */
export default function SubjectBar({ current }: { current: Subject }) {
	const { t } = useTranslation();

	return (
		<Box
			component="nav"
			aria-label={String(t("insights.subjects.label"))}
			sx={{
				position: "sticky",
				top: `${SUBJECT_BAR_TOP}px`,
				zIndex: (theme) => theme.zIndex.appBar - 1,
				minHeight: SUBJECT_BAR_HEIGHT,
				display: "flex",
				overflowX: "auto",
				bgcolor: "background.paper",
				borderBottom: 1,
				borderColor: "divider",
			}}
		>
			{SUBJECTS.map((subject) => {
				const selected = subject === current;

				return (
					<CustomLink
						key={subject}
						underline="none"
						to="/insights"
						search={(prev: Record<string, unknown>) => ({
							...prev,
							tab: subject,
						})}
						// The current subject, for a screen reader as well as for the eye.
						aria-current={selected ? "page" : undefined}
						sx={{
							px: 2,
							py: 1.5,
							whiteSpace: "nowrap",
							color: "text.primary",
							fontWeight: selected ? 700 : 400,
							borderBottom: 3,
							borderColor: selected ? "primary.main" : "transparent",
							"&:hover": { bgcolor: "action.hover" },
						}}
					>
						{t(`insights.subjects.${subject}`)}
					</CustomLink>
				);
			})}
		</Box>
	);
}
