import { RefObject, useState } from "react";
import {
	GridApiPremium,
	gridRowSelectionIdsSelector,
} from "@mui/x-data-grid-premium";
import {
	cleanupPatronRequest,
	isCleanupEligible,
} from "@helpers/cleanupPatronRequest";
import { isGuardedCleanupEnabled } from "@helpers/featureFlags";

interface UsePatronRequestCleanupProps {
	apiRef: RefObject<GridApiPremium | null>;
	dcbApiBase: string;
	headers: Record<string, string>;
	/** The agencies this user administers; only requests they supplied are eligible. */
	agencyCodes: readonly string[];
	onSuccess?: () => void;
}

interface CleanupState {
	open: boolean;
	isCleaning: boolean;
	total: number;
	processed: number;
	successRows: any[];
	errorRows: any[];
	skippedRows: any[];
	refusedRows: any[];
}

const INITIAL_STATE: CleanupState = {
	open: false,
	isCleaning: false,
	total: 0,
	processed: 0,
	successRows: [],
	errorRows: [],
	skippedRows: [],
	refusedRows: [],
};

/**
 * Bulk clean up for the supplying library's requests.
 *
 * Where dcb-service guards cleanup (9.0.0 and later) each request is checked for updates
 * first and the server decides; what it refuses is reported rather than retried, because
 * this application has no override - the item is not back and only a consortium
 * administrator can overrule that.
 */
export const usePatronRequestCleanup = ({
	apiRef,
	dcbApiBase,
	headers,
	agencyCodes,
	onSuccess,
}: UsePatronRequestCleanupProps) => {
	const guarded = isGuardedCleanupEnabled();
	const [cleanupState, setCleanupState] = useState<CleanupState>(INITIAL_STATE);

	const handleCleanup = async () => {
		if (apiRef == null) {
			return;
		}

		const selectedRows = Array.from(
			gridRowSelectionIdsSelector(apiRef).values(),
		).filter((row) => row !== null && row !== undefined);

		if (selectedRows.length === 0) return;

		const eligibleRows: any[] = [];
		const skippedRows: any[] = [];

		selectedRows.forEach((row) => {
			if (isCleanupEligible(row, { guarded, agencyCodes })) {
				eligibleRows.push(row);
			} else {
				skippedRows.push(row);
			}
		});

		setCleanupState({
			...INITIAL_STATE,
			open: true,
			isCleaning: eligibleRows.length > 0,
			total: eligibleRows.length,
			skippedRows,
		});

		if (eligibleRows.length === 0) return;

		let processed = 0;
		const batchSize = 5;

		for (let i = 0; i < eligibleRows.length; i += batchSize) {
			const batch = eligibleRows.slice(i, i + batchSize);
			const batchSuccess: any[] = [];
			const batchError: any[] = [];
			const batchRefused: any[] = [];

			await Promise.all(
				batch.map(async (row) => {
					const outcome = await cleanupPatronRequest(
						dcbApiBase,
						headers,
						row,
						{ refreshFirst: guarded },
					);

					if (outcome.kind === "cleaned") {
						batchSuccess.push(row);
					} else if (outcome.kind === "refused") {
						batchRefused.push(row);
					} else {
						batchError.push(row);
					}
				}),
			);
			processed += batch.length;

			setCleanupState((prev) => ({
				...prev,
				processed,
				successRows: [...prev.successRows, ...batchSuccess],
				errorRows: [...prev.errorRows, ...batchError],
				refusedRows: [...prev.refusedRows, ...batchRefused],
			}));
		}

		setCleanupState((prev) => ({ ...prev, isCleaning: false }));

		if (onSuccess) onSuccess();

		if (apiRef?.current) {
			apiRef.current.setRowSelectionModel({ type: "include", ids: new Set() });
		}
	};

	const handleCloseCleanup = () => {
		setCleanupState((prev) => ({ ...prev, open: false }));
	};

	return {
		cleanupState,
		handleCleanup,
		handleCloseCleanup,
	};
};
