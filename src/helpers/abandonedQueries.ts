import type { Query, QueryCache } from "@tanstack/react-query";

type AnyQuery = Query<unknown, unknown, unknown, readonly unknown[]>;

/**
 * Which failed queries belong to a page the reader has left: every observer gone, and no fetch
 * started since. Such a failure is nobody's to report, so it must not send the app to an error
 * page. A route loader's own fetch never had an observer, so it still does.
 */
export const trackAbandonedQueries = (cache: QueryCache): ((query: AnyQuery) => boolean) => {
	const abandoned = new WeakSet<AnyQuery>();
	cache.subscribe((event) => {
		if (event.type === "observerRemoved" && event.query.getObserversCount() === 0) {
			abandoned.add(event.query);
		} else if (event.type === "observerAdded") {
			abandoned.delete(event.query);
		} else if (
			event.type === "updated" &&
			event.action.type === "fetch" &&
			event.query.getObserversCount() === 0
		) {
			// A fetch nobody watches yet is a loader's or a prefetch's, for the page being opened
			abandoned.delete(event.query);
		}
	});
	return (query) => abandoned.has(query);
};
