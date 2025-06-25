import { IconButton, Tooltip } from "@mui/material";
import {
	useGridSelector,
	gridDetailPanelExpandedRowIdsSelector,
	gridDetailPanelExpandedRowsContentCacheSelector,
	GridRowId,
	useGridApiContext,
} from "@mui/x-data-grid-premium";
import { useTranslation } from "react-i18next";
import UnfoldLess from "@mui/icons-material/UnfoldLess";
import UnfoldMore from "@mui/icons-material/UnfoldMore";

export default function DetailPanelHeader() {
	const apiRef = useGridApiContext();
	const { t } = useTranslation();

	const expandedRowIds = useGridSelector(
		apiRef,
		gridDetailPanelExpandedRowIdsSelector
	);
	const rowsWithDetailPanels = useGridSelector(
		apiRef,
		gridDetailPanelExpandedRowsContentCacheSelector
	);

	const noDetailPanelsOpen = expandedRowIds.size === 0;
	const expandOrCollapseAll = () => {
		// Now using the keys from the rows with detail panels above.
		// as v8 deprecated getRowId
		const allRowIdsWithDetailPanels: GridRowId[] =
			Object.keys(rowsWithDetailPanels);

		// Convert to set to avoid typing issues in v8
		apiRef.current.setExpandedDetailPanels(
			noDetailPanelsOpen ? new Set(allRowIdsWithDetailPanels) : new Set()
		);
	};

	const Icon = noDetailPanelsOpen ? UnfoldMore : UnfoldLess;

	return (
		<Tooltip
			title={
				noDetailPanelsOpen ? t("ui.actions.expand") : t("ui.actions.collapse")
			}>
			<span>
				<IconButton
					size="small"
					tabIndex={-1}
					onClick={expandOrCollapseAll}
					aria-label={noDetailPanelsOpen ? "Expand All" : "Collapse All"}>
					<Icon fontSize="inherit" />
				</IconButton>
			</span>
		</Tooltip>
	);
}
