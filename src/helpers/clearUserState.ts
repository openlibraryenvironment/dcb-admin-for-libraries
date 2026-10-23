import { storageKey } from "@helpers/appBase";
import { clearAgencySelection } from "@/hooks/useAgencyCodes";
import { useGridStore } from "@/hooks/useDataGridStore";
import { clearInsightsCost } from "@/hooks/insightsCostStore";
import { clearSessionSavedFilters } from "@helpers/savedFilters";

/**
 * Everything one person's session leaves in this browser, for signing out on a shared
 * machine. Display settings (theme, typeface, motion) are the device's and are kept.
 */
export function clearUserState(): void {
	useGridStore.getState().clearGridState();
	clearAgencySelection();
	clearInsightsCost();
	clearSessionSavedFilters();
	sessionStorage.removeItem(storageKey("grid-views"));
	// The store is a grid page's, not the shell's: emptied in memory only if a grid loaded it
	void import("@/hooks/rememberedViewStore").then(({ useRememberedViewStore }) =>
		useRememberedViewStore.setState({ views: {} }),
	);
	// Column visibility, which an earlier build kept here; it is in the URL now
	sessionStorage.removeItem(storageKey("grid-storage"));
	sessionStorage.removeItem(storageKey("afterLoginRedirectPath"));
}
