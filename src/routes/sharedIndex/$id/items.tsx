import { createFileRoute } from "@tanstack/react-router";
import axios from "axios";
import { useCallback, useState } from "react";
import { useAuth } from "react-oidc-context";
import { ItemAvailabilityResponse } from "../../../types/ItemAvailabilityResponse";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { GridColDef } from "@mui/x-data-grid";
import Box from "@mui/material/Box";
import { DataGridPremium } from "@mui/x-data-grid-premium";
import { Card, Typography } from "@mui/material";
import { CustomLink } from "../../../components/CustomLink";
import MasterDetail from "../../../components/MasterDetail/MasterDetail";

export const Route = createFileRoute("/sharedIndex/$id/items")({
	component: RouteComponent,
});

function RouteComponent() {
	const { id } = Route.useParams();
	const auth = useAuth();
	const [availabilityResults, setAvailabilityResults] = useState<any>({});
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(false);
	console.log(id);

	// Query for the actual items.
	// const fetchRecords = async () => {
	// 	setLoading(true);
	// 	try {
	// 		const response = await axios.get<any[]>(
	// 			`${import.meta.env.VITE_DCB_API_BASE}/items/availability`,
	// 			{
	// 				headers: { Authorization: `Bearer ${auth.user?.access_tokens}` },
	// 				params: {
	// 					clusteredBibId: id,
	// 					filters: "none",
	// 				},
	// 			}
	// 		);
	// 		setLoading(false);
	// 		setAvailabilityResults(response.data);
	// 	} catch (error) {
	// 		console.error("Error:", error);
	// 		setLoading(false);
	// 		setError(true);
	// 	}
	// };

	// Does this have to be a callback

	const fetchItemAvailability = useCallback(async () => {
		if (!auth.user?.access_token) {
			// set an alert instead
			throw new Error("No access token available");
		}

		const response = await axios.get(
			`${import.meta.env.VITE_DCB_API_BASE}/items/availability`,
			{
				headers: {
					Authorization: `Bearer ${auth.user.access_token}`,
				},
				params: {
					clusteredBibId: id,
					// filters: "none",
				},
			}
		);

		return response.data;
	}, [auth.user?.access_token, id]);

	const { data, isLoading, isError } = useQuery<ItemAvailabilityResponse>({
		queryKey: ["itemAvailability", id],
		queryFn: fetchItemAvailability,
		enabled: !!auth.user?.access_token,
		staleTime: 1000 * 60 * 5, // 5 minutes
	});

	const columns: GridColDef[] = [
		{
			field: "agencyCode",
			headerName: "Agency Code",
			flex: 0.3,
			filterable: false,
			sortable: false,
			valueGetter: (value, row) => row?.agency?.code ?? "-",
		},
		{
			field: "id",
			headerName: "Item ID",
			minWidth: 50,
			flex: 0.3,
			filterable: false,
			sortable: false,
		},
		{
			field: "status",
			headerName: "Status",
			minWidth: 100,
			filterable: false,
			sortable: false,
			flex: 0.4,
			valueGetter: (value, row) => row?.status?.code,
		},
		{
			field: "isRequestable",
			headerName: "Requestable",
			minWidth: 50,
			type: "boolean",
			filterable: false,
			sortable: false,
			flex: 0.3,
		},
		{
			field: "isSuppressed",
			headerName: "Suppressed",
			minWidth: 50,
			type: "boolean",
			filterable: false,
			sortable: false,
			flex: 0.3,
		},
		{
			field: "holdCount",
			headerName: "Hold Count",
			minWidth: 50,
			type: "number",
			filterable: false,
			sortable: false,
			flex: 0.3,
		},
		{
			field: "dueDate",
			headerName: "Date Due",
			minWidth: 100,
			flex: 0.4,
			filterable: false,
			sortable: false,
			valueGetter: (value: any, row: { dueDate: string | null }) => {
				const dateDue = row?.dueDate;
				return dateDue ? dayjs(dateDue).format("YYYY-MM-DD") : "-";
			},
		},
		{
			field: "availabilityDate",
			headerName: "Date Available",
			minWidth: 100,
			flex: 0.4,
			filterable: false,
			sortable: false,
			valueGetter: (value: any, row: { availabilityDate: string | null }) => {
				const dateAvailable = row?.availabilityDate;
				return dateAvailable ? dayjs(dateAvailable).format("YYYY-MM-DD") : "-";
			},
		},
		{
			field: "canonicalItemType",
			headerName: "Supplier Type",
			minWidth: 100,
			filterable: false,
			sortable: false,
			flex: 0.5,
		},
	];

	if (isError) {
		// Sub in Error component
		return (
			<Box sx={{ width: "100%" }}>
				<Card sx={{ p: 4, textAlign: "center", my: 2 }}>
					<Typography variant="h6">Error</Typography>
					<Typography>
						There was an issue retrieving the items data. Please try again
						later.
					</Typography>
				</Card>
			</Box>
		);
	}

	// deprecate auto height and adornments, use input props instead
	// Sub in breadcrumbs and an actual layout when we can
	return (
		<Box sx={{ width: "100%" }}>
			<Typography variant="h4" component="h1" gutterBottom>
				Items for Cluster: {id}
			</Typography>

			<Box sx={{ my: 2 }}>
				<CustomLink to="/sharedIndex/">« Back to Shared Index</CustomLink>
				{" | "}
				<CustomLink to="/sharedIndex/$id/cluster" params={{ id: id }}>
					View Cluster Details
				</CustomLink>
			</Box>
			<DataGridPremium
				loading={isLoading}
				rows={data?.itemList ?? []}
				columns={columns}
				autoHeight
				// getRowId={(row: { id: string }) => row.id}
				sx={{ border: 0 }}
				disableAggregation={true}
				disableRowGrouping={true}
				getDetailPanelContent={({ row }) => (
					<MasterDetail type="items" row={row} />
				)}
				slots={{
					noRowsOverlay: () => (
						<Box
							sx={{
								display: "flex",
								justifyContent: "center",
								alignItems: "center",
								height: "100%",
								p: 2,
							}}>
							No items available for this cluster
						</Box>
					),
				}}
			/>
		</Box>
	);
}
