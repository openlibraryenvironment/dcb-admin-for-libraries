import { useState } from "react";
import { IconButton, Tooltip } from "@mui/material";
import { InfoOutlined } from "@mui/icons-material";

/**
 * A short explanation behind a focusable button, so hover, focus and a tap all open it and
 * Escape closes it (WCAG 2.1.1, 1.4.13). Anything someone needs in order to act stays visible
 * text instead; anything longer than a sentence or two is MetricInfo's popover.
 */
export default function InfoTooltip({ label, title }: { label: string; title: string }) {
	const [open, setOpen] = useState(false);

	return (
		<Tooltip
			title={title}
			describeChild
			open={open}
			onOpen={() => setOpen(true)}
			onClose={() => setOpen(false)}>
			{/* Opens rather than toggles: a mouse click lands on a tooltip hover already opened */}
			<IconButton size="small" aria-label={label} onClick={() => setOpen(true)}>
				<InfoOutlined fontSize="small" />
			</IconButton>
		</Tooltip>
	);
}
