
/**
 * Filter options for a column holding a Host LMS code, labelled by library.
 *
 * One option per CODE: a Host LMS shared by several libraries is one value, and
 * MUI's singleSelect labels a cell with the first option matching its value - so
 * one option per library named every co-tenant's requests after whichever
 * library happened to come first. The label names them all instead.
 */
export const hostLmsLibraryOptions = (
	libraries: readonly {
		fullName: string;
		agency?: { hostLms?: { code?: string } | null } | null;
	}[],
): { value: string; label: string }[] => {
	const names = new Map<string, string[]>();
	for (const library of libraries) {
		const code = library?.agency?.hostLms?.code;
		if (!code) continue;
		names.set(code, [...(names.get(code) ?? []), library.fullName]);
	}
	return [...names].map(([value, fullNames]) => ({
		value,
		label: fullNames.join(", "),
	}));
};
