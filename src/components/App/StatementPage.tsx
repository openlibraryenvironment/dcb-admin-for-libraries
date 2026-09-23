import type { ReactNode } from "react";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

/** The shell for a statement about this software. */
export function StatementPage({
	title,
	children,
}: {
	title: string;
	children: ReactNode;
}) {
	return (
		// ~68 characters at the body size. Long-form prose needs a measure; the
		// page's own width is set for grids, which are not prose.
		<Stack spacing={3} sx={{ maxWidth: "68ch" }}>
			<Typography variant="h1">{title}</Typography>
			{children}
		</Stack>
	);
}

/** One section: an h2 and its prose, so the heading order is right by construction. */
export function StatementSection({
	heading,
	children,
}: {
	heading: string;
	children: ReactNode;
}) {
	return (
		<Stack component="section" spacing={1.5}>
			<Typography variant="h3" component="h2">
				{heading}
			</Typography>
			{children}
		</Stack>
	);
}
