import { Box, Divider } from "@mui/material";
import Grid from "@mui/material/Grid2";

export default function MasterDetailLayout({ children, width }: any) {
	return (
		<Box>
			<Grid
				container
				spacing={{ xs: 1, md: 2 }}
				columns={{ xs: 3, sm: 6, md: 9, lg: 12 }}
				pl={13}
				sx={{
					py: 2,
					height: "100%",
					boxSizing: "border-box",
					position: "sticky",
					left: 0,
					width,
				}}>
				{children}
			</Grid>
			<Grid size={12}>
				<Divider aria-hidden="true"></Divider>
			</Grid>
		</Box>
	);
}
