/**
 * The one result a lookup found, or nothing. A local id is unique only within its own
 * system, so a lookup across all of them can find another patron; showing the first of
 * several would show somebody else's details.
 */
export const onlyMatch = <T>(
	page: { totalSize?: number | null; content?: readonly T[] | null } | null | undefined,
): T | undefined => (page?.totalSize === 1 ? (page.content?.[0] ?? undefined) : undefined);
