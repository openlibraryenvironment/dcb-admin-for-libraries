import type { TypographyVariantsOptions } from "@mui/material/styles";

import "./augmentation";

/**
 * The type scale.
 *
 * A size that should move with the text-size preference has to be in `rem`:
 * that preference scales the ROOT font size, and a px value silently opts out.
 */
export const typography: TypographyVariantsOptions = {
	appTitle: {
		fontSize: 20,
		color: "var(--mui-palette-primary-headerText)",
	},
	h1: {
		fontSize: 32,
		fontWeight: 400,
		color: "var(--mui-palette-primary-headingColour)",
	},
	h2: {
		fontSize: 24,
		fontWeight: 400,
		color: "var(--mui-palette-primary-headingColour)",
	},
	h3: {
		fontSize: 18,
		color: "var(--mui-palette-primary-headingColour)",
	},
	h4: {
		fontSize: 18,
		color: "var(--mui-palette-primary-headingColour)",
	},
	hitCount: {
		fontWeight: "bold",
		color: "var(--mui-palette-primary-hitCountText)",
	},
	searchResultTitle: {
		fontSize: "1.3rem",
	},
	loginCardText: {
		fontSize: 18,
	},
	cardActionText: {
		fontSize: "1rem",
	},
	subheading: {
		fontSize: "1.3rem",
	},
	componentSubheading: {
		fontSize: "1.3rem",
	},
	attributeTitle: {
		fontWeight: "bold",
	},
	attributeText: {
		wordBreak: "break-word",
		textWrap: "wrap",
	},
	loginHeader: {
		fontSize: 32,
		fontWeight: "bold",
	},
	modalTitle: {
		textAlign: "center",
		fontWeight: "bold",
	},
	homePageText: {
		fontSize: "1.1rem",
	},
	notFoundTitle: {
		fontSize: "3rem",
	},
	notFoundText: {
		fontSize: "1.5rem",
	},
	linkedFooterTextSize: {
		fontSize: "14px",
	},
	linkedFooterHeader: {
		fontSize: "18px",
		fontWeight: "bold",
	},
	loadingText: {
		fontSize: 32,
		fontWeight: 400,
		textAlign: "center",
	},
	accordionSummary: {
		fontSize: 20,
		fontWeight: 700,
	},
	subTabTitle: {
		fontSize: 12,
	},
};
