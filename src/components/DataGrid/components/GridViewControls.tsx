import { lazy, Suspense, useState } from "react";
import { useTranslation } from "react-i18next";
import { BookmarksOutlined, FilterAltOffOutlined, LinkRounded } from "@mui/icons-material";
import { Tooltip } from "@mui/material";
import { ToolbarButton } from "@mui/x-data-grid-premium";

import TimedAlert from "@components/TimedAlert/TimedAlert";
import { useAnnounce } from "@/hooks/useAnnouncer";
import type { GridViews } from "@/hooks/useSyncedDataGrid";

// Its form brings react-hook-form and yup, which most grid pages otherwise never load
const SavedFiltersDialog = lazy(() => import("./SavedFiltersDialog"));

/** Copies the address, which carries the grid's filter, sort and page but never a barcode. */
export function ShareViewButton({ views }: { views: GridViews }) {
	const { t } = useTranslation();
	const [result, setResult] = useState<"copied" | "failed" | null>(null);

	const share = async () => {
		await views.flush();
		try {
			await navigator.clipboard.writeText(window.location.href);
			setResult("copied");
		} catch {
			setResult("failed");
		}
	};

	return (
		<>
			<Tooltip title={t("ui.data_grid.views.share")}>
				<ToolbarButton aria-label={t("ui.data_grid.views.share")} onClick={() => void share()}>
					<LinkRounded fontSize="small" />
				</ToolbarButton>
			</Tooltip>
			<TimedAlert
				open={result !== null}
				onCloseFunc={(_event: unknown, reason?: string) =>
					reason !== "clickaway" && setResult(null)
				}
				severityType={result === "failed" ? "error" : views.hasPrivate ? "warning" : "success"}
				alertText={
					result === "failed"
						? t("ui.data_grid.views.share_failed")
						: views.hasPrivate
							? t("ui.data_grid.views.share_copied_private")
							: t("ui.data_grid.views.share_copied")
				}
			/>
		</>
	);
}

export function SavedFiltersButton({ views }: { views: GridViews }) {
	const { t } = useTranslation();
	const [open, setOpen] = useState(false);
	// Mounted from the first open on, so later closes keep their transition and focus return
	const [opened, setOpened] = useState(false);

	return (
		<>
			<Tooltip title={t("ui.data_grid.views.title")}>
				<ToolbarButton
					aria-label={t("ui.data_grid.views.title")}
					aria-haspopup="dialog"
					onClick={() => {
						setOpened(true);
						setOpen(true);
					}}
				>
					<BookmarksOutlined fontSize="small" />
				</ToolbarButton>
			</Tooltip>
			{opened ? (
				<Suspense fallback={null}>
					<SavedFiltersDialog open={open} onClose={() => setOpen(false)} views={views} />
				</Suspense>
			) : null}
		</>
	);
}


/** Every filter, including a barcode held out of the URL, and the sort, back to the grid's own. */
export function ResetViewButton({ views }: { views: GridViews }) {
	const { t } = useTranslation();
	const announce = useAnnounce();

	return (
		<Tooltip title={t("ui.data_grid.views.reset")}>
			<ToolbarButton
				aria-label={t("ui.data_grid.views.reset")}
				onClick={() => {
					views.reset();
					announce(t("ui.data_grid.views.reset_done"));
				}}
			>
				<FilterAltOffOutlined fontSize="small" />
			</ToolbarButton>
		</Tooltip>
	);
}
