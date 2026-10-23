import { RefObject, useState } from "react";
import {
	GridApiPremium,
	gridRowSelectionIdsSelector,
} from "@mui/x-data-grid-premium";
import {
	cleanupPatronRequest,
	isCleanupEligible,
} from "@helpers/cleanupPatronRequest";
import {
	isAgencyScopedRequestsEnabled,
	isGuardedCleanupEnabled,
} from "@helpers/featureFlags";

interface UsePatronRequestCleanupProps {
	apiRef: RefObject<GridApiPremium | null>;
	dcbApiBase: string;
	/** The agencies this user administers; only requests they borrowed or supplied are eligible. */
	agencyCodes: readonly string[];
	/** The user's Host LMS, which names the borrowing library where agency scoping is off. */
	hostLmsCode?: string;
	/** With the ids it cleaned up: at most one page of selection. */
	onSuccess?: (cleanedIds: string[]) => void;
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
	/** The refused rows are being cleaned up anyway, after a second confirmation. */
	overriding: boolean;
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
	overriding: false,
};

/**
 * Bulk clean up, for the borrowing or a supplying library.
 *
 * Where dcb-service guards cleanup (9.0.0 and later) each request is checked for updates
 * first and the server decides. What it refuses can be cleaned up anyway, once the user has
 * confirmed where the item is (overrideConfirmOpen, confirmOverride). docs/cleanup.md.
 */
export const usePatronRequestCleanup = ({
	apiRef,
	dcbApiBase,
	agencyCodes,
	hostLmsCode,
	onSuccess,
}: UsePatronRequestCleanupProps) => {
	const guarded = isGuardedCleanupEnabled();
	const agencyScoped = isAgencyScopedRequestsEnabled();
	const [cleanupState, setCleanupState] = useState<CleanupState>(INITIAL_STATE);
	const [overrideConfirmOpen, setOverrideConfirmOpen] = useState(false);

	/** At most five at a time: one inbound action becomes one call per request to dcb-service. */
	const runBatches = async (rows: any[], override: boolean): Promise<string[]> => {
		let processed = 0;
		const batchSize = 5;
		const cleanedIds: string[] = [];

		for (let i = 0; i < rows.length; i += batchSize) {
			const batch = rows.slice(i, i + batchSize);
			const batchSuccess: any[] = [];
			const batchError: any[] = [];
			const batchRefused: any[] = [];

			await Promise.all(
				batch.map(async (row) => {
					const outcome = await cleanupPatronRequest(dcbApiBase, row, {
						refreshFirst: guarded,
						override,
					});

					if (outcome.kind === "cleaned") {
						batchSuccess.push(row);
						cleanedIds.push(row.id);
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

		return cleanedIds;
	};

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
			if (isCleanupEligible(row, { guarded, agencyScoped, agencyCodes, hostLmsCode })) {
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

		const cleanedIds = await runBatches(eligibleRows, false);

		setCleanupState((prev) => ({ ...prev, isCleaning: false }));

		if (onSuccess) onSuccess(cleanedIds);

		if (apiRef?.current) {
			apiRef.current.setRowSelectionModel({ type: "include", ids: new Set() });
		}
	};

	const handleCloseCleanup = () => {
		setCleanupState((prev) => ({ ...prev, open: false }));
	};

	/** Only where the server refuses, and so where force exists: 9.0.0 and later. */
	const requestOverride = guarded
		? () => setOverrideConfirmOpen(true)
		: undefined;

	const cancelOverride = () => setOverrideConfirmOpen(false);

	const confirmOverride = async () => {
		setOverrideConfirmOpen(false);
		const refused = cleanupState.refusedRows;
		if (!guarded || refused.length === 0) return;

		setCleanupState((prev) => ({
			...prev,
			isCleaning: true,
			overriding: true,
			total: refused.length,
			processed: 0,
			refusedRows: [],
		}));

		const cleanedIds = await runBatches(refused, true);

		setCleanupState((prev) => ({ ...prev, isCleaning: false, overriding: false }));
		if (onSuccess) onSuccess(cleanedIds);
	};

	return {
		cleanupState,
		handleCleanup,
		handleCloseCleanup,
		requestOverride,
		overrideConfirmOpen,
		cancelOverride,
		confirmOverride,
	};
};

export type PatronRequestCleanup = ReturnType<typeof usePatronRequestCleanup>;
