import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

export const Section = ({ title, children }: any) => (
	<Stack direction="column">
		<Typography variant="attributeTitle">{title}</Typography>
		{children}
	</Stack>
);
