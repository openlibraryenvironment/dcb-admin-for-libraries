import { useMemo } from "react";
import { useAuth } from "react-oidc-context";
import { create } from "zustand";
import { persist } from "zustand/middleware";

import { storageKey } from "@helpers/appBase";

/**
 * The agencies named by the `code` claim, always as a LIST: one person can
 * administer several libraries on a shared system without being a consortium
 * administrator. A single-value claim returns a one-element list, so nothing
 * downstream has to care. docs/insights.md.
 */
export const agencyCodesFrom = (claim: unknown): string[] => {
	if (Array.isArray(claim)) {
		return claim.map((value) => String(value).trim()).filter(Boolean);
	}

	if (claim === undefined || claim === null) return [];

	// A single claim carrying several codes separated by commas, which is how some
	// identity providers express a multi-valued attribute
	return String(claim)
		.split(",")
		.map((value) => value.trim())
		.filter(Boolean);
};

/**
 * Which of a user's agencies to show, given what they last chose.
 *
 * A stored choice is honoured only while it is still one of theirs. Claims change, and a
 * stale value would silently scope the whole application to a library the user no longer
 * administers - which looks like missing data rather than like a permissions change.
 *
 * Extracted from the hook because it is the part with a rule in it, and this repo tests
 * functions rather than components.
 */
export const resolveAgencyCode = (
	agencyCodes: readonly string[],
	stored: string | null,
): string | undefined =>
	stored && agencyCodes.includes(stored) ? stored : agencyCodes[0];

interface AgencySelectionState {
	/** The code the user last chose, or null if they never have. */
	selected: string | null;
	select: (code: string) => void;
}

/**
 * ONE selection, shared by every consumer. In `useState` each of the fourteen
 * readers got a private copy, so changing library in the header left every
 * grid on screen scoped to the previous one. Persisted, and namespaced by app
 * base. docs/insights.md.
 */
const useAgencySelectionStore = create<AgencySelectionState>()(
	persist(
		(set) => ({
			selected: null,
			select: (selected) => set({ selected }),
		}),
		{ name: storageKey("selected-agency-code") },
	),
);

export interface AgencyCodeSelection {
	/** Every library this user administers. */
	agencyCodes: string[];
	/** The one being looked at. Undefined only when the claim names none. */
	agencyCode: string | undefined;
	selectAgencyCode: (code: string) => void;
	/**
	 * Whether to offer a choice at all. False for the ordinary single-library user, who
	 * must not be shown a selector with one entry.
	 */
	hasMultipleAgencies: boolean;
}

/**
 * Which library the user is currently looking at.
 *
 * The selection is scoped to one library at a time rather than showing several at once.
 * A library administrator's screens are about their library - "my requests", "my
 * mappings" - and merging two libraries into one view would make every count and every
 * grid ambiguous about which it belongs to.
 */
export const useAgencyCodes = (): AgencyCodeSelection => {
	const auth = useAuth();
	const selected = useAgencySelectionStore((state) => state.selected);
	const select = useAgencySelectionStore((state) => state.select);

	const agencyCodes = useMemo(
		() => agencyCodesFrom(auth.user?.profile?.code),
		[auth.user?.profile?.code],
	);

	// DERIVED, not synced. An effect that copied the claim into state would leave every
	// consumer undefined for one render, disabling queries that then have to re-enable,
	// and this hook is called on every page.
	const agencyCode = useMemo(
		() => resolveAgencyCode(agencyCodes, selected),
		[agencyCodes, selected],
	);

	const selectAgencyCode = useMemo(
		() => (code: string) => {
			if (agencyCodes.includes(code)) select(code);
		},
		[agencyCodes, select],
	);

	return {
		agencyCodes,
		agencyCode,
		selectAgencyCode,
		hasMultipleAgencies: agencyCodes.length > 1,
	};
};
