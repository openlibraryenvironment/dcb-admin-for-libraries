import { useEffect, useRef } from "react";
import type { SyncedDataGrid } from "@/hooks/useSyncedDataGrid";

/**
 * A filter or sort the server cannot process fails the whole query; this puts
 * the grid back to its defaults, once per error, so the page is usable again.
 * A failure with nothing narrowed is left alone: it is not the reader's input.
 */
export const useDataGridErrorSafely = (
	grid: Pick<SyncedDataGrid, "isNarrowed" | "resetFilterAndSort">,
	isError: boolean,
	error: unknown,
	onReset?: () => void,
) => {
	const errorRef = useRef<unknown>(null);
	const { isNarrowed, resetFilterAndSort } = grid;

	useEffect(() => {
		if (!isError) {
			errorRef.current = null;
			return;
		}
		if (error === errorRef.current || !isNarrowed) return;

		resetFilterAndSort();
		onReset?.();
		errorRef.current = error;
	}, [isError, error, isNarrowed, resetFilterAndSort, onReset]);
};
