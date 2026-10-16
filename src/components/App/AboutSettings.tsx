import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Button, Link, Stack, Typography } from "@mui/material";

import ReleaseHighlightsDialog from "@components/ReleaseHighlights/ReleaseHighlightsDialog";
import { releaseInfoQueryOptions, releaseNotesUrl } from "@helpers/release";

/** This app's version, its release notes, and this release's highlights again. */
export function AboutSettings() {
	const { t } = useTranslation();
	const release = useQuery(releaseInfoQueryOptions());
	const [open, setOpen] = useState(false);
	const version = release.data?.version ?? null;
	const build = release.data?.build ?? null;

	return (
		<Stack spacing={2} sx={{ alignItems: "flex-start" }}>
			<Typography>
				{release.isPending
					? t("about.checking")
					: version
						? t("about.version", { version })
						: build
							? t("about.build", { build })
							: t("about.unknown")}
			</Typography>
			<Link href={releaseNotesUrl(version)} target="_blank" rel="noopener noreferrer">
				{version
					? t("about.release_notes", { version })
					: t("about.release_notes_all")}
			</Link>
			<Button variant="outlined" aria-haspopup="dialog" onClick={() => setOpen(true)}>
				{t("about.whats_new")}
			</Button>
			<ReleaseHighlightsDialog open={open} onClose={() => setOpen(false)} version={version} />
		</Stack>
	);
}
