import Cancel from "@mui/icons-material/Cancel";
import CheckCircle from "@mui/icons-material/CheckCircle";
import { Avatar, StepIconProps, useTheme } from "@mui/material";

// A component for our implementation of the Material UI Stepper Icons
// This handles icons for active, completed, error and regular steps.
export default function DCBStepIcon(props: StepIconProps) {
	const { active, completed, error, icon } = props;
	const theme = useTheme();
	const iconSize = 28;

	if (error) {
		return (
			<Avatar
				sx={{
					bgcolor: "transparent",
					width: iconSize,
					height: iconSize,
				}}>
				<Cancel
					sx={{
						fontSize: `${iconSize * 1.1}px`, // Adjust size if needed
					}}
					htmlColor={(theme.vars || theme).palette.error.main}
				/>
			</Avatar>
		);
	}

	if (completed) {
		return (
			<Avatar
				sx={{
					bgcolor: "transparent",
					width: iconSize,
					height: iconSize,
				}}>
				<CheckCircle
					htmlColor={(theme.vars || theme).palette.success.main}
					sx={{
						fontSize: `${iconSize * 1.1}px`,
					}}
				/>
			</Avatar>
		);
	}

	// Active step
	if (active) {
		return (
			<Avatar
				sx={{
					bgcolor: (theme.vars || theme).palette.primary.main,
					// contrastText, not iconSymbol: the ink has to answer to the ground
					// beneath it, and primary.main is a light blue in dark mode - white
					// on it measured 2.24:1. MUI derives this per scheme, so it stays
					// right if primary.main moves.
					color: (theme.vars || theme).palette.primary.contrastText,
					width: iconSize,
					height: iconSize,
					fontWeight: "bold",
				}}>
				{String(icon)} {/* Display the step number */}
			</Avatar>
		);
	}

	// Inactive steps
	// Shows the number ('icon') inside an outlined grey circle background
	return (
		<Avatar
			sx={{
				bgcolor: (theme.vars || theme).palette.primary.inactiveBackground,
				color: (theme.vars || theme).palette.primary.iconSymbol,
				width: iconSize,
				height: iconSize,
			}}>
			{String(icon)}
		</Avatar>
	);
}
