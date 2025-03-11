import Grid from "@mui/material/Grid2";
import Typography from "@mui/material/Typography";
import { DataGridPremium, GridColDef } from "@mui/x-data-grid-premium";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
	component: HomeComponent,
});
const columns: GridColDef[] = [
	{
		field: "test",
		headerName: "test",
		minWidth: 300,
		flex: 0.5,
	},
];

function HomeComponent() {
	return (
		<Grid
			container
			spacing={{ xs: 2, md: 3 }}
			columns={{ xs: 4, sm: 8, md: 12 }}>
			<Grid size={4}>
				<Typography>
					{/* {t("welcome.text", {
						library: library?.fullName,
						name: session?.user?.name,
					})} */}
					DCB ADMIN FOR LIBRARIES TEST
				</Typography>
			</Grid>
			<Grid size={12}>
				<DataGridPremium columns={columns}></DataGridPremium>
			</Grid>
		</Grid>
	);
}
