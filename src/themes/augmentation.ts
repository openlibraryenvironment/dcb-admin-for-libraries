// The theme's module augmentation: the brand tokens, the custom typography
// variants, and the component variants that carry them. Type-only, so it is
// imported for its side effect rather than for a value.
//
// Separate from the token VALUES so that adding a token is one edit in
// tokens.ts plus one here, rather than a hunt through a 600-line file.

declare module "@mui/material/styles" {
	interface PaletteColor {
		breadcrumbs?: string;
		buttonForSelectedChildPage?: string;
		buttonForSelectedPage?: string;
		detailsAccordionSummary: string;
		exclamationIcon: string;
		footerArea?: string;
		footerText?: string;
		foreground1?: string;
		header: string;
		headerText?: string;
		headingColour?: string;
		hitCountText?: string;
		hover?: string;
		hoverOnSelectedPage: string;
		iconSymbol?: string;
		inactiveBackground?: string;
		link?: string;
		linkText?: string;
		landingBackground?: string;
		landingCard?: string;
		loginCard?: string;
		loginText?: string;
		navigationBackground?: string;
		navigationText?: string;
		navigationTextActive?: string;
		searchResultBackground?: string;
		searchResultTitle?: string;
		subTabBackground?: string;
		subTabText?: string;
		secondary?: {
			main?: string;
		};
		selectedText?: string;
		sidebar: string;
		titleArea?: string;
		linkedFooterBackground?: string;
		linkedFooterText?: string;
		pageBackground?: string;
		pageContentBackground?: string;
		loginButtonOutlineColor?: string;
		outlineColor?: string;
		editableFieldBackground?: string;
		errorBackground?: string;
		outcomeGood?: string;
		outcomeBad?: string;
	}

	interface SimplePaletteColorOptions {
		breadcrumbs?: string;
		buttonForSelectedChildPage?: string;
		buttonForSelectedPage?: string;
		detailsAccordionSummary?: string;
		exclamationIcon?: string;
		footerArea?: string;
		footerText?: string;
		foreground1?: string;
		header?: string;
		headerText?: string;
		headingColour?: string;
		hitCountText?: string;
		hover?: string;
		hoverOnSelectedPage?: string;
		iconSymbol?: string;
		inactiveBackground?: string;
		link?: string;
		linkText?: string;
		landingBackground?: string;
		landingCard?: string;
		loginCard?: string;
		loginText?: string;
		navigationBackground?: string;
		navigationText?: string;
		navigationTextActive?: string;
		searchResultBackground?: string;
		searchResultTitle?: string;
		subTabBackground?: string;
		subTabText?: string;
		secondary?: {
			main?: string;
		};
		selectedText?: string;
		sidebar?: string;
		titleArea?: string;
		linkedFooterBackground?: string;
		linkedFooterText?: string;
		pageBackground?: string;
		pageContentBackground?: string;
		loginButtonOutlineColor?: string;
		outlineColor?: string;
		editableFieldBackground?: string;
		errorBackground?: string;
		outcomeGood?: string;
		outcomeBad?: string;
	}
	interface TypographyVariants {
		accordionSummary?: React.CSSProperties;
		appTitle?: React.CSSProperties;
		attributeText?: React.CSSProperties;
		attributeTitle?: React.CSSProperties;
		cardActionText?: React.CSSProperties;
		componentSubheading?: React.CSSProperties;
		hitCount?: React.CSSProperties;
		homePageText?: React.CSSProperties;
		loginCardText?: React.CSSProperties;
		loginHeader?: React.CSSProperties;
		loadingText?: React.CSSProperties;
		linkedFooterHeader?: React.CSSProperties;
		linkedFooterTextSize?: React.CSSProperties;
		modalTitle?: React.CSSProperties;
		notFoundText?: React.CSSProperties;
		notFoundTitle?: React.CSSProperties;
		searchResultTitle?: React.CSSProperties;
		subheading?: React.CSSProperties;
		subTabTitle?: React.CSSProperties;
	}
	interface TypographyVariantsOptions {
		accordionSummary?: React.CSSProperties;
		appTitle?: React.CSSProperties;
		attributeText?: React.CSSProperties;
		attributeTitle?: React.CSSProperties;
		cardActionText?: React.CSSProperties;
		componentSubheading?: React.CSSProperties;
		hitCount?: React.CSSProperties;
		homePageText?: React.CSSProperties;
		loginCardText?: React.CSSProperties;
		loginHeader?: React.CSSProperties;
		loadingText?: React.CSSProperties;
		linkedFooterHeader?: React.CSSProperties;
		linkedFooterTextSize?: React.CSSProperties;
		modalTitle?: React.CSSProperties;
		notFoundText?: React.CSSProperties;
		notFoundTitle?: React.CSSProperties;
		searchResultTitle?: React.CSSProperties;
		subheading?: React.CSSProperties;
		subTabTitle?: React.CSSProperties;
	}
}

// Add variant declarations for the new accordion and button variants
declare module "@mui/material/Paper" {
	interface PaperPropsVariantOverrides {
		styled: true;
		dataGrid: true;
		sub: true;
	}
}

declare module "@mui/material/Accordion" {
	interface AccordionPropsVariantOverrides {
		styled: true;
		dataGrid: true;
		sub: true;
	}
}

declare module "@mui/material/AccordionDetails" {
	interface AccordionDetailsPropsOverrides {
		sub: true;
		dataGrid: true;
	}
}

declare module "@mui/material/AccordionSummary" {
	interface AccordionSummaryPropsOverrides {
		sub: true;
		dataGrid: true;
	}
}
declare module "@mui/material/Typography" {
	interface TypographyPropsVariantOverrides {
		appTitle: true;
		loginCardText: true;
		subheading: true;
		cardActionText: true;
		attributeTitle: true;
		attributeText: true;
		loginHeader: true;
		modalTitle: true;
		homePageText: true;
		notFoundTitle: true;
		notFoundText: true;
		componentSubheading: true;
		linkedFooterTextSize: true;
		linkedFooterHeader: true;
		loadingText: true;
		accordionSummary: true;
		subTabTitle: true;
		hitCount: true;
	}
}

declare module "@mui/material/Tab" {
	interface TabPropsVariantOverrides {
		secondary: true;
	}
}

export {};
