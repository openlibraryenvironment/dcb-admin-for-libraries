import { useId } from "react";
import { useTranslation } from "react-i18next";
import {
	Box,
	Button,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	Link,
	Typography,
} from "@mui/material";

import { useAuth } from "react-oidc-context";

import { HIGHLIGHTS, READ_ONLY_HIGHLIGHTS } from "@constants/releaseHighlights";
import { isReadOnly } from "@helpers/readOnlyAccess";
import { releaseNotesUrl } from "@helpers/release";

/** The main changes of this release, in a few lines, with a link to the full notes. */
export default function ReleaseHighlightsDialog({
	open,
	onClose,
	version,
}: {
	open: boolean;
	onClose: () => void;
	version: string | null;
}) {
	const { t } = useTranslation();
	const titleId = useId();
	const auth = useAuth();
	const items = isReadOnly(auth.user?.profile?.roles)
		? READ_ONLY_HIGHLIGHTS
		: HIGHLIGHTS;

	return (
		<Dialog open={open} onClose={onClose} aria-labelledby={titleId} fullWidth maxWidth="sm">
			<DialogTitle id={titleId}>
				{version
					? t("release_highlights.title_version", { version })
					: t("release_highlights.title")}
			</DialogTitle>
			{/* Focusable, so the list can be scrolled from the keyboard on a short screen */}
			<DialogContent tabIndex={0}>
				<Typography gutterBottom>{t("release_highlights.intro")}</Typography>
				<Box component="ul" sx={{ pl: 2.5, my: 2 }}>
					{items.map((key) => (
						<Box component="li" key={key} sx={{ mb: 1.5 }}>
							<Typography variant="h6" component="h3">
								{t(`release_highlights.items.${key}.heading`)}
							</Typography>
							<Typography>{t(`release_highlights.items.${key}.body`)}</Typography>
						</Box>
					))}
				</Box>
				<Link href={releaseNotesUrl(version)} target="_blank" rel="noopener noreferrer">
					{t("release_highlights.notes_link")}
				</Link>
			</DialogContent>
			<DialogActions>
				<Button variant="contained" onClick={onClose}>
					{t("release_highlights.close")}
				</Button>
			</DialogActions>
		</Dialog>
	);
}
