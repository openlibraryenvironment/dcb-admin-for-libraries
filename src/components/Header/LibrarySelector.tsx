import { MenuItem, TextField, useTheme } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import request from "graphql-request";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "react-oidc-context";

import { getLibraries } from "@queries/getLibraries";
import { LibrariesQueryData } from "@models/ReactQueryHelperTypes";
import { useAgencyCodes } from "@/hooks/useAgencyCodes";

/**
 * Which of the user's libraries they are looking at.
 *
 * Renders nothing at all unless the `code` claim names more than one. Most people
 * administer a single library and a picker with one entry is worse than no picker -
 * it implies a choice that does not exist, and invites the question of what the other
 * option would have been.
 *
 * The people this is for are shared-system administrators: someone running one Koha
 * on behalf of several of its member libraries, who is not a consortium administrator
 * and should not be made one to do the job.
 */
export const LibrarySelector = () => {
	const { t } = useTranslation();
	const theme = useTheme();
	const auth = useAuth();
	const { cfg } = useRouter().options.context as { cfg: any };

	const { agencyCodes, agencyCode, selectAgencyCode, hasMultipleAgencies } =
		useAgencyCodes();

	const headers = useMemo(
		() => ({ Authorization: `Bearer ${auth.user?.access_token}` }),
		[auth.user?.access_token]
	);

	// Named so the choice reads as library names rather than agency codes. Only
	// fetched when there is a choice to present.
	const { data } = useQuery<LibrariesQueryData>({
		queryKey: ["selectableLibraries", headers, agencyCodes, cfg?.VITE_DCB_API_BASE],
		enabled: hasMultipleAgencies && !!cfg?.VITE_DCB_API_BASE,
		// Library names change at the pace of onboarding, not of browsing, and
		// this renders in the header on every page - the default staleTime of 0
		// would refetch the whole set on every navigation.
		staleTime: 5 * 60 * 1000,
		queryFn: async () =>
			request(
				cfg.VITE_DCB_API_BASE + "/graphql",
				getLibraries,
				{
					query: agencyCodes.map((code) => `agencyCode:${code}`).join(" OR "),
					pagesize: agencyCodes.length,
					pageno: 0,
					order: "fullName",
					orderBy: "ASC",
				},
				headers
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

	return (
		<TextField
			select
			size="small"
			value={agencyCode}
			onChange={(event) => selectAgencyCode(event.target.value)}
			label={t("header.library_selector")}
			sx={{
				mr: 2,
				minWidth: 220,
				"& .MuiInputBase-root": {
					color: (theme.vars || theme).palette.primary.headerText,
				},
				"& .MuiInputLabel-root": {
					color: (theme.vars || theme).palette.primary.headerText,
				},
			}}>
			{agencyCodes.map((code) => (
				<MenuItem key={code} value={code}>
					{nameFor(code)}
				</MenuItem>
			))}
		</TextField>
	);
};
