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
	sessionStorage.removeItem(storageKey("afterLoginRedirectPath"));
}
