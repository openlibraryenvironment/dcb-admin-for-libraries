import { createTheme } from "@mui/material/styles";
import { red } from "@mui/material/colors";

// A custom theme for this app - may need to be a .ts file
const theme = createTheme({
	cssVariables: true,
	palette: {
		primary: {
			main: "#556cd6",
		},
		secondary: {
			main: "#19857b",
		},
		error: {
			main: red.A400,
		},
	},
	typography: {
		appTitle: {
			fontSize: 20,
		},
		h1: {
			fontSize: 32,
			fontWeight: 400,
		},
		h2: {
			fontSize: 24,
			fontWeight: 400,
		},
		h3: {
			fontSize: 18,
		},
		h4: {
			fontSize: 18,
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
	},
});

export default theme;

// CHOP DOWN AS NECESSARY
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
		hover?: string;
		hoverOnSelectedPage: string;
		link?: string;
		linkText?: string;
		landingBackground?: string;
		landingCard?: string;
		loginCard?: string;
		loginText?: string;
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
		hover?: string;
		hoverOnSelectedPage?: string;
		link?: string;
		linkText?: string;
		landingBackground?: string;
		landingCard?: string;
		loginCard?: string;
		loginText?: string;
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
	}
	interface TypographyVariants {
		appTitle?: React.CSSProperties;
		loginCardText?: React.CSSProperties;
		subheading?: React.CSSProperties;
		cardActionText?: React.CSSProperties;
		attributeTitle?: React.CSSProperties;
		loginHeader?: React.CSSProperties;
		modalTitle?: React.CSSProperties;
		homePageText?: React.CSSProperties;
		notFoundTitle?: React.CSSProperties;
		notFoundText?: React.CSSProperties;
		componentSubheading?: React.CSSProperties;
		linkedFooterTextSize?: React.CSSProperties;
		linkedFooterHeader?: React.CSSProperties;
		loadingText?: React.CSSProperties;
		accordionSummary?: React.CSSProperties;
		subTabTitle?: React.CSSProperties;
	}
	interface TypographyVariantsOptions {
		appTitle?: React.CSSProperties;
		loginCardText?: React.CSSProperties;
		subheading?: React.CSSProperties;
		cardActionText?: React.CSSProperties;
		attributeTitle?: React.CSSProperties;
		attributeText?: React.CSSProperties;
		loginHeader?: React.CSSProperties;
		modalTitle?: React.CSSProperties;
		homePageText?: React.CSSProperties;
		notFoundTitle?: React.CSSProperties;
		notFoundText?: React.CSSProperties;
		componentSubheading?: React.CSSProperties;
		linkedFooterTextSize?: React.CSSProperties;
		linkedFooterHeader?: React.CSSProperties;
		loadingText?: React.CSSProperties;
		accordionSummary?: React.CSSProperties;
		subTabTitle?: React.CSSProperties;
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
	}
}
