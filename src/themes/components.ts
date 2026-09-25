import type { Components, Theme } from "@mui/material/styles";
import type {} from "@mui/x-data-grid/themeAugmentation";

import "./augmentation";

/**
 * Component defaults and overrides.
 *
 * Independent of the colour scheme: every colour here is READ from the theme
 * rather than written down, so one set serves every scheme.
 */
export const components: Components<Theme> = {
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
						borderTop: `2px solid ${(theme.vars || theme).palette.divider}`,
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
	MuiTypography: {
		defaultProps: {
			// An unrecognised variant falls through to `span`
			// (Typography.js:141). A partial map is safe - Typography still
			// falls back to its own default for anything absent.
			//
			// attributeTitle is absent deliberately: it is a field label, not a
			// heading. modalTitle too - DialogTitle sets component="h2" itself.
			variantMapping: {
				accordionSummary: "h2",
				componentSubheading: "h2",
				loadingText: "h1",
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
				color: (theme.vars || theme).palette.primary.navigationText,
				"&.Mui-focusVisible": {
					outline: "2px solid", // For keyboard focus
					boxSizing: "border-box",
					borderColor: (theme.vars || theme).palette.primary.outlineColor,
					outlineOffset: "-2px",
				},
				"&.Mui-selected": {
					fontWeight: "bold",
					color: (theme.vars || theme).palette.primary.navigationTextActive,
				},
			}),
		},
	},
	MuiTabs: {
		styleOverrides: {
			root: ({ theme }) => ({
				// A purpose-named token, not secondary.main: MUI's secondary slot is
				// whatever a component asks for with color="secondary", and a value
				// chosen to carry white nav text at 4.5:1 is not that. The two values
				// are the ones the axe gate passes in each scheme.
				backgroundColor: (theme.vars || theme).palette.primary
					.navigationBackground,
				"& .MuiTab-root": {
					"&.Mui-selected": {
						fontWeight: "bold",
					},
				},
				// The nested tab strip on detail pages. A literal background against a
				// scheme-dependent text colour put light blue on light blue in dark
				// mode; both halves are now tokens.
				"&.secondary": {
					backgroundColor: (theme.vars || theme).palette.primary
						.subTabBackground,
					"& .MuiTab-root": {
						color: (theme.vars || theme).palette.primary.subTabText,
					},
				},
			}),
		},
	},
};
