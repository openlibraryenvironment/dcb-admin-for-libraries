import { queryOptions } from "@tanstack/react-query";
import request from "graphql-request";

import { authHeaders } from "@helpers/auth";
import { queryKeys } from "@helpers/queryKeys";
import type { LibrariesQueryData } from "@models/ReactQueryHelperTypes";
import { getLibraryNames } from "@queries/getLibraryNames";

// Its own module, not sharedQueries: the header imports it, and the header is on every page
/** The names of a user's own libraries, for anything that lists them by name. */
export const libraryNamesQueryOptions = (apiBase: string, agencyCodes: string[]) =>
	queryOptions({
		queryKey: queryKeys.library.names(apiBase, agencyCodes),
		// Library names change at the pace of onboarding, not of browsing
		staleTime: 5 * 60 * 1000,
		queryFn: async () =>
			request<LibrariesQueryData>(
				`${apiBase}/graphql`,
				getLibraryNames,
				{
					query: agencyCodes.map((code) => `agencyCode:${code}`).join(" OR "),
					pagesize: agencyCodes.length,
					pageno: 0,
					order: "fullName",
					orderBy: "ASC",
				},
				await authHeaders(),
			),
	});
