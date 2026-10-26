/**
 * The user's libraries that are party to a request: who they may tag it, or write a note on it,
 * as. dcb-service applies the same rule, and refuses a library outside it.
 */
export const authorableAs = (
	agencyCodes: readonly string[],
	involvedAgencyCodes: readonly string[],
): string[] =>
	[...new Set(agencyCodes)].filter((code) => involvedAgencyCodes.includes(code)).sort();
