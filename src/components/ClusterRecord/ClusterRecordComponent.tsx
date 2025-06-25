import { useRouter } from "@tanstack/react-router";
import axios from "axios";
import { useCallback, useMemo, useState } from "react";
import { useAuth } from "react-oidc-context";
import { ItemAvailabilityResponse } from "@models/ItemAvailabilityResponse";
import { QueryFunction, useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { GridColDef, GridRowParams } from "@mui/x-data-grid";
import Box from "@mui/material/Box";
import {
	Button,
	Menu,
	MenuItem,
	Typography,
	Accordion,
	AccordionSummary,
	AccordionDetails,
	Stack,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { CustomLink } from "../CustomLink";
import MasterDetail from "../../components/MasterDetail/MasterDetail";
import { Route } from "../../routes/indexes/$indexCode/$recordId";
import { ClusterDetailResponse } from "@models/ClusterDetailResponse";
import ExpeditedCheckout from "@forms/ExpeditedCheckout/ExpeditedCheckout";
import StaffRequest from "@forms/StaffRequest/StaffRequest";
import { useTranslation } from "react-i18next";
import Loading from "../../components/Loading/Loading";
import Error from "../../components/Error/Error";
import DataGrid from "@components/DataGrid/DataGrid";
import { GRID_DETAIL_PANEL_TOGGLE_COL_DEF } from "@mui/x-data-grid-premium";
import { DetailPanelToggle } from "@components/MasterDetail/components/DetailPanelToggle/DetailPanelToggle";
import DetailPanelHeader from "@components/MasterDetail/components/DetailPanelHeader/DetailPanelHeader";

interface CombinedData {
	availability: ItemAvailabilityResponse;
	clusterDetail: ClusterDetailResponse;
	comparisonItems: ItemAvailabilityResponse;
}

export default function ClusterRecordComponent() {
	const { cfg } = useRouter().options.context as { cfg: any };
	const { indexCode, recordId } = Route.useParams();
	const auth = useAuth();
	const { t } = useTranslation();
	const [showStaffRequest, setShowStaffRequest] = useState(false);
	const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
	const [isAccordionExpanded, setIsAccordionExpanded] = useState(false);
	const [isItemsAccordionExpanded, setIsItemsAccordionExpanded] =
		useState(false);

	const actionsMenuOpen = Boolean(anchorEl);

	const handleActionsClick = (event: React.MouseEvent<HTMLElement>) => {
		setAnchorEl(event.currentTarget);
	};

	const handleActionsClose = () => {
		setAnchorEl(null);
	};

	const [showExpeditedCheckout, setShowExpeditedCheckout] = useState(false);

	const fetchItemAvailability = useCallback(async () => {
		if (!auth.user?.access_token) {
			console.error("No access token");
		}

		const response = await axios.get(
			`${cfg.VITE_DCB_API_BASE}/items/availability`,
			{
				headers: {
					Authorization: `Bearer ${auth.user?.access_token}`,
				},
				params: {
					clusteredBibId: recordId,
				},
			}
		);
		return response.data;
	}, [auth.user?.access_token, recordId, cfg.VITE_DCB_API_BASE]);

	const fetchComparisonItems = useCallback(async () => {
		if (!auth.user?.access_token) {
			console.error("No access token");
		}

		const response = await axios.get(
			`${cfg.VITE_DCB_API_BASE}/items/availability`,
			{
				headers: {
					Authorization: `Bearer ${auth.user?.access_token}`,
				},
				params: {
					clusteredBibId: recordId,
					filters: "none",
				},
			}
		);
		return response.data;
	}, [auth.user?.access_token, recordId, cfg.VITE_DCB_API_BASE]);

	const fetchClusterDetail = useCallback(async () => {
		if (!auth.user?.access_token) {
			console.error("No access token");
		}

		const response = await axios.get(
			`${cfg.VITE_DCB_SEARCH_BASE}/public/opac-inventory/instances/${recordId}`,
			{
				headers: {
					Authorization: `Bearer ${auth.user?.access_token}`,
				},
			}
		);
		return response.data;
	}, [auth.user?.access_token, recordId, cfg.VITE_DCB_SEARCH_BASE]);

	const fetchCombinedData: QueryFunction<CombinedData> = async () => {
		const [availability, clusterDetail, comparisonItems] = await Promise.all([
			fetchItemAvailability(),
			fetchClusterDetail(),
			fetchComparisonItems(),
		]);
		return { availability, clusterDetail, comparisonItems };
	};

	const { data, isLoading, isError } = useQuery<CombinedData>({
		queryKey: ["combinedData", recordId],
		queryFn: fetchCombinedData,
		enabled: !!auth.user?.access_token,
		staleTime: 1000 * 60 * 5, // 5 minutes
	});

	const itemsNotShown = useMemo(() => {
		if (!data?.availability?.itemList || !data?.comparisonItems?.itemList) {
			if (data?.comparisonItems?.itemList) {
				return data?.comparisonItems?.itemList;
			} else return [];
		}

		const availabilityItemIds = new Set(
			data.availability.itemList.map((item) => item.id)
		);

		return data.comparisonItems.itemList.filter(
			(comparisonItem) => !availabilityItemIds.has(comparisonItem.id)
		);
	}, [data]);

	const handleShowStaffRequest = () => {
		setShowStaffRequest(true);
		handleActionsClose();
	};

	const handleShowExpeditedCheckout = () => {
		setShowExpeditedCheckout(true);
		handleActionsClose();
	};

	const columns: GridColDef[] = [
		{
			...GRID_DETAIL_PANEL_TOGGLE_COL_DEF,
			headerName: t("ui.data_grid.master_detail"),
			renderCell: (params) => (
				<DetailPanelToggle id={params.id} value={params.value} />
			),
			renderHeader: () => <DetailPanelHeader />,
		},
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

	if (isLoading) {
		return (
			<Loading
				title="Loading Cluster Data"
				subtitle="Please wait while we fetch the item and cluster information."
			/>
		);
	}

	if (isError) {
		return (
			<Error
				title="Error"
				message="There was an issue retrieving the cluster data."
				description="Please try again later. If the problem persists, contact support."
				action="Reload Page"
				reload={true}
			/>
		);
	}

	const itemCount = data?.availability?.itemList?.length ?? 0;

	// deprecate auto height and adornments, use input props instead
	// Sub in breadcrumbs and an actual layout when we can

	console.log(data?.comparisonItems?.itemList);
	console.log(itemsNotShown);

	console.log(itemsNotShown?.length);
	return (
		<Box sx={{ width: "100%" }}>
			<Stack
				direction="row"
				justifyContent="space-between"
				alignItems="center"
				sx={{ mb: 2 }}>
				<Stack direction={"column"}>
					<Typography variant="h4" component="h1">
						{t("requesting.shared_index.items_for_cluster", {
							number: itemCount,
							id: recordId,
						})}
					</Typography>
					{itemsNotShown?.length > 0 ? (
						<Typography variant="h4" component="h1">
							{t("requesting.shared_index.items_not_shown_long", {
								number: itemsNotShown?.length,
								id: recordId,
							})}
						</Typography>
					) : null}
				</Stack>

				<Box>
					<Button
						id="actions-button"
						aria-controls={actionsMenuOpen ? "actions-menu" : undefined}
						aria-haspopup="true"
						aria-expanded={actionsMenuOpen ? "true" : undefined}
						variant="contained"
						onClick={handleActionsClick}>
						{t("ui.actions.title")}
					</Button>
					<Menu
						id="actions-menu"
						anchorEl={anchorEl}
						open={actionsMenuOpen}
						onClose={handleActionsClose}
						MenuListProps={{
							"aria-labelledby": "actions-button",
						}}>
						<MenuItem onClick={handleShowStaffRequest}>
							{t("requesting.staff_request.actions.place")}
						</MenuItem>
						<MenuItem onClick={handleShowExpeditedCheckout}>
							{t("requesting.expedited_checkout.steps.checkout")}
						</MenuItem>
					</Menu>
				</Box>
			</Stack>

			<DataGrid
				checkboxSelection={false}
				columns={columns}
				disableAggregation={true}
				disableHoverInteractions={true}
				disableRowGrouping={true}
				getDetailPanelContent={({ row }: GridRowParams) => (
					<MasterDetail type="items" row={row} />
				)}
				identifier="ClusterRecordItems"
				listViewEnabled={false}
				loading={isLoading}
				noResultsText={t("requesting.items_not_found")}
				pagination
				pivotingEnabled={false}
				rows={data?.availability?.itemList ?? []}
				scrollbarVisible={false}
				searchText={t("requesting.items_search")}
				toolbarVisible={true}
				type={"Items"}
			/>

			<Accordion
				expanded={isAccordionExpanded}
				onChange={() => setIsAccordionExpanded(!isAccordionExpanded)}>
				<AccordionSummary
					expandIcon={<ExpandMoreIcon />}
					aria-controls="cluster-details-content"
					id="cluster-details-header">
					<Typography variant="h6">
						{t("requesting.shared_index.cluster_details")}
					</Typography>
				</AccordionSummary>
				<AccordionDetails>
					<Typography variant="h5">{data?.clusterDetail.title}</Typography>
					<Typography variant="body1" sx={{ my: 2 }}>
						{data?.clusterDetail.description}
					</Typography>

					<Box sx={{ my: 2 }}>
						<CustomLink
							to="/indexes/$indexCode"
							params={{ indexCode: indexCode }}>
							{t("requesting.shared_index.return")}
						</CustomLink>
						{/* {" | "} */}
						{/* <CustomLink
							to="/indexes/$indexCode/$recordId"
							params={{ indexCode: indexCode, recordId: recordId }}>
							View Cluster Details Page (Legacy)
						</CustomLink> */}
					</Box>

					<pre>{JSON.stringify(data?.clusterDetail, null, 2)}</pre>
				</AccordionDetails>
			</Accordion>
			{itemsNotShown?.length > 0 ? (
				<Accordion
					expanded={isItemsAccordionExpanded}
					onChange={() =>
						setIsItemsAccordionExpanded(!isItemsAccordionExpanded)
					}>
					<AccordionSummary
						expandIcon={<ExpandMoreIcon />}
						aria-controls="items-not-shown-content"
						id="not-shown-header">
						<Typography variant="h6">
							{t("requesting.shared_index.items_not_shown", {
								number: itemsNotShown?.length,
							})}
						</Typography>
					</AccordionSummary>
					<AccordionDetails>
						{/** Diagnosis for mappings */}
						<Typography>
							{t("requesting.shared_index.items_not_shown_resolution")}
						</Typography>
						<DataGrid
							checkboxSelection={false}
							columns={columns}
							disableAggregation={true}
							disableRowGrouping={true}
							disableHoverInteractions={true}
							getDetailPanelContent={({ row }: any) => (
								<MasterDetail type="items" row={row} />
							)}
							identifier="ClusterRecordItemsNotShown"
							loading={isLoading}
							listViewEnabled={false}
							noResultsText={t("requesting.items_not_found")}
							pagination
							pivotingEnabled={false}
							scrollbarVisible={false}
							searchText={t("requesting.items_search")}
							toolbarVisible={false}
							rows={itemsNotShown ?? []}
							// sx={{ border: 0, mb: 2 }}
							type={"Items"}
						/>
					</AccordionDetails>
				</Accordion>
			) : null}
			{showStaffRequest && (
				<StaffRequest
					show={showStaffRequest}
					onClose={() => setShowStaffRequest(false)}
					bibClusterId={recordId}
				/>
			)}

			{showExpeditedCheckout && (
				<ExpeditedCheckout
					show={showExpeditedCheckout}
					onClose={() => setShowExpeditedCheckout(false)}
					bibClusterId={recordId}
				/>
			)}
		</Box>
	);
}
