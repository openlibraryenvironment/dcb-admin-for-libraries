import {
	MenuItem,
	TextField,
	inputLabelClasses,
	outlinedInputClasses,
	selectClasses,
	useTheme,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import request from "graphql-request";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { getLibraryNames } from "@queries/getLibraryNames";
import { queryKeys } from "@helpers/queryKeys";
import { authHeaders } from "@helpers/auth";
import { LibrariesQueryData } from "@models/ReactQueryHelperTypes";
import { useAgencyCodes } from "@/hooks/useAgencyCodes";

/**
 * Which of the user's libraries they are looking at. Renders NOTHING unless
 * the `code` claim names more than one: a picker with one entry implies a
 * choice that does not exist. Who it is for: docs/insights.md.
 */
export const LibrarySelector = () => {
	const { t } = useTranslation();
	const theme = useTheme();
	const { cfg } = useRouter().options.context as { cfg: any };

	const { agencyCodes, agencyCode, selectAgencyCode, hasMultipleAgencies } =
		useAgencyCodes();

	// Named so the choice reads as library names rather than agency codes. Only
	// fetched when there is a choice to present.
	const { data } = useQuery<LibrariesQueryData>({
		queryKey: queryKeys.library.names(cfg?.VITE_DCB_API_BASE, agencyCodes),
		enabled: hasMultipleAgencies && !!cfg?.VITE_DCB_API_BASE,
		// Library names change at the pace of onboarding, not of browsing, and
		// this renders in the header on every page - the default staleTime of 0
		// would refetch the whole set on every navigation.
		staleTime: 5 * 60 * 1000,
		queryFn: async () =>
			request(
				cfg.VITE_DCB_API_BASE + "/graphql",
				getLibraryNames,
				{
					query: agencyCodes.map((code) => `agencyCode:${code}`).join(" OR "),
					pagesize: agencyCodes.length,
					pageno: 0,
					order: "fullName",
					orderBy: "ASC",
				},
				await authHeaders()
			),
	});

	const nameFor = useMemo(() => {
		const names = new Map<string, string>();

		for (const library of data?.libraries?.content ?? []) {
			if (library?.agencyCode) names.set(library.agencyCode, library.fullName);
		}

		// Falls back to the code, so the selector still works before the names land
		return (code: string) => names.get(code) ?? code;
	}, [data]);

	if (!hasMultipleAgencies || !agencyCode) return null;

	const headerText = (theme.vars || theme).palette.primary.headerText;

	return (
		<TextField
			select
			size="small"
			value={agencyCode}
			onChange={(event) => selectAgencyCode(event.target.value)}
			label={t("header.library_selector")}
			sx={{
				mr: 2,
				minWidth: { xs: "10rem", sm: "13.75rem" },
				"& .MuiInputBase-root": {
					color: headerText,
				},
				[`& .${inputLabelClasses.root}, & .${inputLabelClasses.root}.${inputLabelClasses.focused}`]:
					{ color: headerText },
				// MUI's defaults are text.primary at rest and primary.main on focus, and
				// light mode paints the bar itself primary.main.
				[`& .${outlinedInputClasses.notchedOutline}, & .${outlinedInputClasses.root}:hover .${outlinedInputClasses.notchedOutline}, & .${outlinedInputClasses.root}.${outlinedInputClasses.focused} .${outlinedInputClasses.notchedOutline}`]:
					{ borderColor: headerText },
				[`& .${selectClasses.icon}`]: { color: headerText },
			}}>
			{agencyCodes.map((code) => (
				<MenuItem key={code} value={code}>
					{nameFor(code)}
				</MenuItem>
			))}
		</TextField>
	);
};
