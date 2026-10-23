import { CleanupOverrideDialog } from "@components/CleanupOverrideDialog/CleanupOverrideDialog";
import { CleanupProgressDialog } from "@components/DataGrid/components/CleanupProgressDialog";
import type { PatronRequestCleanup } from "@/hooks/usePatronRequestCleanup";

/** A grid's bulk clean-up: its progress and results, and the second confirmation to clean up anyway. */
export default function CleanupDialogs({ cleanup }: { cleanup: PatronRequestCleanup }) {
	const { cleanupState } = cleanup;
	return (
		<>
			<CleanupProgressDialog
				open={cleanupState.open}
				isCleaning={cleanupState.isCleaning}
				progress={cleanupState.total > 0 ? (cleanupState.processed / cleanupState.total) * 100 : 0}
				total={cleanupState.total}
				processed={cleanupState.processed}
				successRows={cleanupState.successRows}
				errorRows={cleanupState.errorRows}
				skippedRows={cleanupState.skippedRows}
				refusedRows={cleanupState.refusedRows}
				onOverride={cleanup.requestOverride}
				onClose={cleanup.handleCloseCleanup}
			/>
			<CleanupOverrideDialog
				open={cleanup.overrideConfirmOpen}
				count={cleanupState.refusedRows.length}
				onClose={cleanup.cancelOverride}
				onConfirm={() => void cleanup.confirmOverride()}
			/>
		</>
	);
}
