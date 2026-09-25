import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";

interface AttributeProps {
	/** The field name, already translated. */
	label: ReactNode;
	children: ReactNode;
}

/**
 * A field label and its value, associated as a description list so assistive
 * technology reads them as a pair rather than as two unrelated runs of text.
 *
 * One list per pair, not one per page: the grids these sit in mix attributes
 * with headings and buttons, and a <dl> around the whole grid would not be
 * valid HTML. docs/attributes.md has the argument.
 */
export const Attribute = ({ label, children }: AttributeProps) => (
	<Box component="dl" sx={{ display: "flex", flexDirection: "column", m: 0 }}>
		<Typography component="dt" variant="attributeTitle">
			{label}
		</Typography>
		{/* dd carries a 40px inline-start margin by default, and the flex column
		    reproduces the Stack this replaced. */}
		<Box
			component="dd"
			sx={{ display: "flex", flexDirection: "column", m: 0 }}>
			{children}
		</Box>
	</Box>
);
