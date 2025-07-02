import { createTheme } from "@mui/material/styles";
import { red } from "@mui/material/colors";
import type {} from "@mui/x-data-grid/themeAugmentation";

// The DCB Admin for Libraries custom theme. Make it configurable and switchable.
const theme = createTheme({
	cssVariables: {
		colorSchemeSelector: "data",
	},
	components: {
		MuiAccordion: {
			defaultProps: {
				slotProps: { transition: { timeout: 400 } },
			},
			variants: [
				{
					props: { variant: "styled" },
					style: {
						borderBottom: "0px",
						borderLeft: "0px",
						borderRight: "0px",
						"&::before": {
							display: "none",
						},
					},
				},
				{
					props: { variant: "dataGrid" },
					style: ({ theme }) => ({
						boxShadow: "none",
						backgroundColor: "transparent",
						"&:before": {
							display: "none",
						},
						"&:first-of-type": {
							borderTop: `2px solid ${theme.palette.divider}`,
						},
					}),
				},
				{
					props: { variant: "sub" },
					style: {
						borderBottom: "0px",
						borderLeft: "0px",
						borderRight: "0px",
						marginTop: "16px",
						"&::before": {
							display: "none",
						},
					},
				},
			],
		},
		MuiAccordionSummary: {
			styleOverrides: {
				root: {
					variants: [
						{
							props: { variant: "dataGrid" },
							style: ({ theme }) => ({
								backgroundColor: "transparent",
								flexDirection: "row-reverse",
								minHeight: "auto",
								"&.Mui-expanded": {
									minHeight: "auto",
								},
								"& .MuiAccordionSummary-content": {
									marginLeft: theme.spacing(1),
								},
							}),
						},
						{
							props: { variant: "sub" },
							style: {
								backgroundColor: "transparent",
								"&.Mui-focusVisible": {
									outline: "2px solid", // For keyboard focus
								},
							},
						},
					],
				},
			},
		},
		MuiAccordionDetails: {
			styleOverrides: {
				root: {
					variants: [
						{
							props: { variant: "dataGrid" },
							style: {
								marginTop: "16px",
							},
						},
						{
							props: { variant: "sub" },
							style: {
								marginTop: "0px",
							},
						},
					],
				},
			},
		},
		MuiButton: {
			defaultProps: {
				disableRipple: true, // This can also be toggled on a per-variant basis
			},
			styleOverrides: {
				root: {
					"&.Mui-focusVisible": {
						outline: "2px solid", // For keyboard focus
					},
				},
			},
		},
		MuiIconButton: {
			defaultProps: {
				disableRipple: true,
			},
		},
		MuiListItemButton: {
			defaultProps: {
				disableRipple: true,
			},
		},
		MuiDataGrid: {
			styleOverrides: {
				// focus styles
				cell: {
					"&:focus": {
						outline: "none",
					},
					":focus-visible": {
						outline: "2px solid",
					},
				},
				cellCheckbox: {
					"&:focus-within": {
						outline: "2px solid",
						outlineOffset: "-3px",
					},
				},
				columnHeaderCheckbox: {
					"&:focus-within": {
						outline: "2px solid",
						outlineOffset: "-3px",
					},
				},
				columnHeader: {
					"&:focus": {
						outline: "none",
					},
					":focus-visible": {
						outline: "2px solid",
					},
				},
			},
		},
		MuiTooltip: {
			defaultProps: {
				arrow: true,
			},
		},
		MuiAlertTitle: {
			styleOverrides: {
				root: {
					fontSize: "1.2rem",
				},
			},
		},
		MuiTab: {
			styleOverrides: {
				root: ({ theme }) => ({
					"&.Mui-focusVisible": {
						outline: "2px solid", // For keyboard focus
						boxSizing: "border-box",
						borderColor: theme.palette.primary.outlineColor,
						outlineOffset: "-2px",
					},
				}),
			},
		},
	},

	colorSchemes: {
		light: {
			palette: {
				primary: {
					iconSymbol: "#FFFFFF",
					inactiveBackground: "#8C8C8C",
					main: "#0C4068",
				},
				secondary: {
					main: "#2B7A9F",
				},
				error: {
					main: red.A400,
				},
			},
		},
		dark: {
			palette: {
				primary: {
					iconSymbol: "#FFFFFF",
					inactiveBackground: "#8C8C8C",
					main: "#35B7FF",
				},
				secondary: {
					main: "#75BEDB",
				},
				error: {
					main: red.A400,
				},
			},
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
		iconSymbol?: string;
		inactiveBackground?: string;
		link?: string;
		linkText?: string;
		landingBackground?: string;
		landingCard?: string;
		loginCard?: string;
		loginText?: string;
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
		iconSymbol?: string;
		inactiveBackground?: string;
		link?: string;
		linkText?: string;
		landingBackground?: string;
		landingCard?: string;
		loginCard?: string;
		loginText?: string;
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
	}
}
