import { useEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";

import { MAIN_CONTENT_ID } from "@constants/landmarks";
import { useAnnounce } from "@/hooks/useAnnouncer";

interface HeadMetaEntry {
	title?: string;
}

/**
 * The title of the deepest match that declares one.
 *
 * Taken from the router's own state rather than from document.title: `head`
 * resolves during navigation, so reading the DOM announces the page being left
 * unless the read is deferred, and any deferral is a race.
 */
const useRouteTitle = (): string =>
	useRouterState({
		select: (state) => {
			for (let i = state.matches.length - 1; i >= 0; i--) {
				const meta = state.matches[i].meta as HeadMetaEntry[] | undefined;
				const titled = meta?.find((entry) => entry?.title);
				if (titled?.title) return titled.title;
			}
			return "";
		},
	});

/**
 * Says where the user has just arrived, and puts focus at the top of it.
 *
 * A full page load announces the new page and resets focus to the document. A
 * client-side navigation does neither: focus stays on the tab that was clicked
 * and nothing is said, so a screen-reader user hears the tab's own name and has
 * no signal that the page changed.
 */
export const useRouteAnnouncement = () => {
	const title = useRouteTitle();
	const announce = useAnnounce();
	const announced = useRef<string | null>(null);

	useEffect(() => {
		if (!title) return;

		// The first title is the page the user loaded, which the browser has
		// already announced. Only a change needs saying.
		if (announced.current === null) {
			announced.current = title;
			return;
		}
		if (announced.current === title) return;

		announced.current = title;
		announce(title);
		document.getElementById(MAIN_CONTENT_ID)?.focus({ preventScroll: true });
	}, [title, announce]);
};
