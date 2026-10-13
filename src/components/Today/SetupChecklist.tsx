import { useId } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Box, Paper, Typography } from "@mui/material";
import CheckCircle from "@mui/icons-material/CheckCircle";
import RadioButtonUnchecked from "@mui/icons-material/RadioButtonUnchecked";

import { CustomLink } from "@components/CustomLink";
import {
	isLibraryBrandingEnabled,
	isLibrarySupportUrlEnabled,
} from "@helpers/featureFlags";
import { todayHistoryQueryOptions, type TodayScope } from "@helpers/today";
import type { Library } from "@models/Library";

interface Item {
	id: string;
	done: boolean;
}

const filled = (value: unknown) =>
	value !== null && value !== undefined && String(value).trim() !== "";

/** What the profile holds that patrons and other libraries see. Branded fields only where served. */
const setupItems = (library: Library): Item[] => [
	{ id: "address", done: filled(library.address) },
	{ id: "location", done: filled(library.latitude) && filled(library.longitude) },
	{ id: "website", done: filled(library.patronWebsite) },
	{ id: "contacts", done: (library.contacts?.length ?? 0) > 0 },
	...(isLibraryBrandingEnabled()
		? [{ id: "logo", done: filled(library.brandLogoUrl) }]
		: []),
	...(isLibrarySupportUrlEnabled()
		? [{ id: "support", done: filled(library.supportUrl) }]
		: []),
];

/** Shown only to a library that has never borrowed or supplied: zeros say nothing to it. */
export default function SetupChecklist({
	apiBase,
	scopes,
	library,
}: {
	apiBase: string;
	scopes: Record<TodayScope, string>;
	library: Library;
}) {
	const { t } = useTranslation();
	const headingId = useId();
	const history = useQuery(todayHistoryQueryOptions(apiBase, scopes));

	if (history.data?.borrowed !== 0 || history.data?.supplied !== 0) return null;

	const items = setupItems(library);

	return (
		<Paper component="section" variant="outlined" aria-labelledby={headingId} sx={{ p: 2 }}>
			<Typography variant="h2" id={headingId} gutterBottom>
				{t("today.setup.title")}
			</Typography>
			<Typography gutterBottom>{t("today.setup.intro")}</Typography>
			<Box component="ul" role="list" sx={{ listStyle: "none", p: 0, m: 0 }}>
				{items.map((item) => (
					<Box
						component="li"
						key={item.id}
						sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.5 }}
					>
						{item.done ? (
							<CheckCircle color="success" fontSize="small" aria-hidden />
						) : (
							<RadioButtonUnchecked color="action" fontSize="small" aria-hidden />
						)}
						<Typography component="span">
							{t(item.done ? "today.setup.item_done" : "today.setup.item_todo", {
								item: t(`today.setup.items.${item.id}`),
							})}
						</Typography>
					</Box>
				))}
			</Box>
			<Typography sx={{ mt: 1 }}>
				<CustomLink to="/library">{t("today.setup.link")}</CustomLink>
			</Typography>
		</Paper>
	);
}
