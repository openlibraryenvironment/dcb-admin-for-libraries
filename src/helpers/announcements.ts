import { queryOptions } from "@tanstack/react-query";
import request from "graphql-request";

import { authHeaders } from "@helpers/auth";
import { queryKeys } from "@helpers/queryKeys";
import { getAnnouncements } from "@queries/getAnnouncements";

export interface AnnouncementRow {
	id: string;
	headline: string;
	body: string;
	urgent: boolean;
	dismissible: boolean;
	startsAt: string;
	expiresAt: string;
}

/** Newest first, the order patrons see them in: dcb-service returns the admin list unordered. */
export const newestFirst = (rows: readonly AnnouncementRow[]): AnnouncementRow[] =>
	[...rows].sort((a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt));

/** A library's announcements, live or not; the scope is the library's id. */
export const announcementsQueryOptions = (apiBase: string, scopeId: string) =>
	queryOptions({
		queryKey: queryKeys.announcements.forScope(apiBase, scopeId),
		queryFn: async () =>
			request<{ announcements?: AnnouncementRow[] }>(
				apiBase + "/graphql",
				getAnnouncements(),
				{ scopeType: "LIBRARY", scopeId },
				await authHeaders(),
			),
		select: (data) => ({ ...data, announcements: newestFirst(data.announcements ?? []) }),
		// It changes only through the announcements page, whose mutations invalidate it
		staleTime: 60_000,
		// An empty scope is a request that can only fail
		enabled: Boolean(scopeId),
	});

export const isExpired = (row: AnnouncementRow, now: Date = new Date()) =>
	new Date(row.expiresAt) <= now;

/** What a patron sees right now: started, and not yet expired. */
export const isLive = (row: AnnouncementRow, now: Date = new Date()) =>
	new Date(row.startsAt) <= now && !isExpired(row, now);
