import { queryOptions } from "@tanstack/react-query";
import request from "graphql-request";

import { REFERENCE_LIST_PAGE_SIZE } from "@constants/dataGrid/pagination";
import { authHeaders } from "@helpers/auth";
import {
	LibrariesQueryData,
	LocationsQueryData,
} from "@models/ReactQueryHelperTypes";
import { getLibraries } from "@queries/getLibraries";
import { getLibrary } from "@queries/getLibrary";
import { getLibraryBasics } from "@queries/getLibraryBasics";
import { getLocation } from "@queries/getLocation";
import { queryKeys } from "@helpers/queryKeys";

// Queries asked for in the same shape from more than one place: one definition each,
// so the callers share a cache entry rather than asking again under a different key.

export const libraryQueryOptions = (apiBase: string, agencyCode: string) =>
	queryOptions({
		queryKey: queryKeys.library.detail(apiBase, agencyCode),
		queryFn: async () =>
			request<LibrariesQueryData>(
				`${apiBase}/graphql`,
				getLibrary(),
				{
					query: "agencyCode:" + agencyCode,
					pagesize: 10,
					pageno: 0,
					orderBy: "fullName",
					order: "DESC",
				},
				await authHeaders(),
			),
	});

/** Every library, for pickers and grid filters: bounded by REFERENCE_LIST_PAGE_SIZE. */
export const allLibrariesQueryOptions = (apiBase: string) =>
	queryOptions({
		queryKey: queryKeys.libraries.all(apiBase),
		queryFn: async () =>
			request<LibrariesQueryData>(
				`${apiBase}/graphql`,
				getLibraries,
				{
					query: "",
					pagesize: REFERENCE_LIST_PAGE_SIZE,
					pageno: 0,
					order: "fullName",
					orderBy: "ASC",
				},
				await authHeaders(),
			),
	});

export const libraryBasicsQueryOptions = (apiBase: string, agencyCode: string) =>
	queryOptions({
		queryKey: queryKeys.library.basics(apiBase, agencyCode),
		queryFn: async () =>
			request<LibrariesQueryData>(
				`${apiBase}/graphql`,
				getLibraryBasics,
				{
					query: "agencyCode:" + agencyCode,
					pageno: 0,
					pagesize: 10,
					order: "agencyCode",
					orderBy: "ASC",
				},
				await authHeaders(),
			),
	});

export const locationQueryOptions = (apiBase: string, id: string) =>
	queryOptions({
		queryKey: queryKeys.locations.detail(apiBase, id),
		queryFn: async () =>
			request<LocationsQueryData>(
				`${apiBase}/graphql`,
				getLocation,
				{
					query: "id:" + id,
					pagesize: 10,
					pageno: 0,
					orderBy: "name",
					order: "ASC",
				},
				await authHeaders(),
			),
	});
