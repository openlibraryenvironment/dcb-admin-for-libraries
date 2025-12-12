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
	Typography,
	Accordion,
	AccordionSummary,
	AccordionDetails,
	Stack,
	Tooltip,
	Grid,
	Chip,
	Tab,
	AlertTitle,
	Alert,
} from "@mui/material";
import TabContext from "@mui/lab/TabContext";
import TabList from "@mui/lab/TabList";
import TabPanel from "@mui/lab/TabPanel";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { CustomLink } from "../CustomLink";
import MasterDetail from "../../components/MasterDetail/MasterDetail";
import {
	ClusterDetailResponse,
	Contributor,
	Note,
} from "@models/ClusterDetailResponse";
import { useTranslation } from "react-i18next";
import Loading from "../../components/Loading/Loading";
import Error from "../../components/Error/Error";
import DataGrid from "@components/DataGrid/DataGrid";
import { GRID_DETAIL_PANEL_TOGGLE_COL_DEF } from "@mui/x-data-grid-premium";
import { DetailPanelToggle } from "@components/MasterDetail/components/DetailPanelToggle/DetailPanelToggle";
import DetailPanelHeader from "@components/MasterDetail/components/DetailPanelHeader/DetailPanelHeader";
// import { Route } from "@/routes/__authenticated/indexes/$indexCode/$recordId";
import { Route } from "@/routes/__authenticated/requesting/$recordId";
import CombinedRequestingModal from "@forms/CombinedRequestingModal/CombinedRequestingModal";
import RenderAttribute from "@components/RenderAttribute/RenderAttribute";
import { getAggregatedErrorMessage } from "@helpers/liveAvailabilityErrorMapper";

interface CombinedData {
	availability: ItemAvailabilityResponse;
	clusterDetail: ClusterDetailResponse;
	comparisonItems: ItemAvailabilityResponse;
}
// Key info for this component
// Title, Author, Format, Description, ISBN (or other identifier)
// Bonus info
// Language, No. of available items, Publisher, Top Subjects, Publication Date etc ..
// Everything on the search result and more
// Must be a schema in dcb-locate somewhere
// Then we also need to think about graphql - can we query clusters by their source systems ...

export default function ClusterRecordComponent() {
	const { cfg } = useRouter().options.context as { cfg: any };
	// const { indexCode, recordId } = Route.useParams();
	const { recordId } = Route.useParams();
	const auth = useAuth();
	const { t } = useTranslation();
	const [showCombinedModal, setShowCombinedModal] = useState(false); // Determines whether the requesting modal is visible or not.

	const [isAccordionExpanded, setIsAccordionExpanded] = useState(false);
	const [isItemsAccordionExpanded, setIsItemsAccordionExpanded] =
		useState(false);

	const [activeTab, setActiveTab] = useState(0);

	const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
		setActiveTab(newValue);
	};

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

	// const fetchCombinedData: QueryFunction<CombinedData> = async () => {
	// 	const clusterDetailPromise = fetchClusterDetail();

	// 	// We fetch this first to see if we even need to fetch the other one
	// 	const comparisonItems = await fetchComparisonItems();

	// 	let availability: ItemAvailabilityResponse;

	// 	const [availability, clusterDetail, comparisonItems] = await Promise.all([
	// 		fetchItemAvailability(),
	// 		fetchClusterDetail(),
	// 		fetchComparisonItems(),
	// 	]);
	// 	return { availability, clusterDetail, comparisonItems };
	// };

	const fetchCombinedData: QueryFunction<CombinedData> = async () => {
		const clusterDetailPromise = fetchClusterDetail();

		// We fetch this first to see if we even need to fetch the other one
		const comparisonItems = await fetchComparisonItems();

		let availability: ItemAvailabilityResponse;

		if (comparisonItems?.itemList && comparisonItems.itemList.length > 0) {
			// If there are "items not shown", we need to then fetch the standard list to compare
			availability = await fetchItemAvailability();
		} else {
			// If no items are returned in our "comparisonItems", proceed to return the response
			availability = {
				itemList: comparisonItems?.itemList ?? [],
				timings: comparisonItems?.timings ?? 0,
				bibClusterId: recordId,
				errors: comparisonItems?.errors || [],
			} as ItemAvailabilityResponse;
		}

		const clusterDetail = await clusterDetailPromise;

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
	const requestableCount = data?.availability?.itemList?.length;

	const canRequest = requestableCount !== undefined && requestableCount > 0;
	const totalItemsCount = data?.comparisonItems?.itemList?.length ?? 0;
	const hasZeroItems = !isLoading && data && totalItemsCount === 0;
	const responseErrors = data?.comparisonItems?.errors || [];

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
				title={t("ui.info.loading.document", {
					document_type: t("requesting.cluster"),
				})}
				subtitle={t("ui.info.wait")}
			/>
		);
	}

	if (isError) {
		return (
			<Error
				title={t("ui.feedback.error.loading", {
					entity: t("requesting.cluster"),
				})}
				message={t("ui.feedback.error.loading_message")}
				description={t("ui.info.reload")}
				action={t("ui.actions.reload")}
				reload={true}
			/>
		);
	}

	const itemCount = data?.availability?.itemList?.length ?? 0;

	// Make into a Material UI grid with two sections: "Items" and "Cluster Information" (this needs the source record but also author, language etc)
	return (
		<>
			<Grid
				container
				spacing={{ xs: 2, md: 3 }}
				columns={{ xs: 3, sm: 6, md: 9, lg: 12 }}>
				<Grid size={{ xs: 4, sm: 8, md: 12, lg: 12 }}>
					<Stack
						direction="row"
						justifyContent="space-between"
						alignItems="center"
						sx={{ mb: 2 }}>
						<Typography variant="h1" mb={1}>
							{data?.clusterDetail.title}
						</Typography>
						<Tooltip
							title={
								!canRequest ? t("requesting.cannot_request_no_items") : ""
							}>
							<span>
								<Button
									variant="contained"
									color="primary"
									disabled={!canRequest}
									onClick={() => setShowCombinedModal(true)}>
									{t("ui.actions.place_request")}
								</Button>
							</span>
						</Tooltip>
					</Stack>
				</Grid>
			</Grid>
			<TabContext value={activeTab}>
				<TabList
					onChange={handleTabChange}
					variant="scrollable"
					className="secondary">
					<Tab label={t("requesting.record_information")} />
					<Tab label={t("requesting.items")} />
				</TabList>
				<TabPanel value={0}>
					<Grid
						container
						spacing={{ xs: 2, md: 3 }}
						columns={{ xs: 3, sm: 6, md: 9, lg: 12 }}>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("requesting.contributors")}
								</Typography>
								<Typography>
									{data?.clusterDetail.contributors
										?.map((c: Contributor) => c.name)
										.join(", ")}
								</Typography>
							</Stack>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("requesting.format_title")}
								</Typography>
								<Typography>
									{data?.clusterDetail?.sourceTypes?.join(",")}
								</Typography>
							</Stack>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("requesting.publication_year")}
								</Typography>
								<RenderAttribute
									attribute={data?.clusterDetail?.publicationYear}
								/>
							</Stack>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("requesting.description")}
								</Typography>
								<RenderAttribute attribute={data?.clusterDetail?.description} />
							</Stack>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("requesting.languages")}
								</Typography>
								<Typography>
									{data?.clusterDetail?.languages?.join(",")}
								</Typography>
							</Stack>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("requesting.publisher")}
								</Typography>
								{data?.clusterDetail?.publication
									?.map((pub: { publisher: string }) => pub.publisher)
									.join(", ")}
							</Stack>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("requesting.physical_descriptions")}
								</Typography>
								{data?.clusterDetail?.physicalDescriptions}
							</Stack>
						</Grid>
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("requesting.notes")}
								</Typography>
								{data?.clusterDetail?.notes
									?.map(
										(note: { labelKey: string; note: string }) =>
											note.labelKey + ": " + note.note
									)
									.join(", ")}
							</Stack>
						</Grid>
						<Grid size={{ xs: 4, sm: 8, md: 12, lg: 12 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("requesting.subjects")}
								</Typography>
								<Stack
									direction="row"
									spacing={1}
									flexWrap="wrap"
									useFlexGap
									mb={2}>
									{data?.clusterDetail?.subjects?.map(
										(sub: { value: string }, index: number) => (
											<Chip
												key={
													data?.clusterDetail?.id +
													"." +
													index +
													"." +
													sub.value
												}
												label={sub.value}
											/>
										)
									)}
								</Stack>
							</Stack>
						</Grid>
						<Grid size={{ xs: 4, sm: 8, md: 12, lg: 12 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("requesting.series")}
								</Typography>
								<Stack
									direction="row"
									spacing={1}
									flexWrap="wrap"
									useFlexGap
									mb={2}>
									{data?.clusterDetail?.series?.map(
										(sub: { value: string }, index: number) => (
											<Chip
												key={
													data?.clusterDetail?.id +
													"." +
													index +
													"." +
													sub.value
												}
												label={sub.value}
											/>
										)
									)}
								</Stack>
							</Stack>
						</Grid>
						<Grid size={{ xs: 4, sm: 8, md: 12, lg: 12 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("requesting.notes")}
								</Typography>
								<Stack
									direction="row"
									spacing={1}
									flexWrap="wrap"
									useFlexGap
									mb={2}>
									{data?.clusterDetail?.notes?.map(
										(note: Note, index: number) => (
											<Chip
												key={
													data?.clusterDetail?.id +
													"." +
													index +
													"." +
													note.note
												}
												label={note.labelKey + ": " + note.note}
											/>
										)
									)}
								</Stack>
							</Stack>
						</Grid>
						<Grid size={{ xs: 4, sm: 8, md: 12, lg: 12 }}>
							<Stack direction={"column"}>
								<Typography variant="attributeTitle">
									{t("requesting.identifiers")}
								</Typography>
								<Typography>
									{t("requesting.isbn", {
										isbn: data?.clusterDetail.isbns
											? data?.clusterDetail.isbns
													?.map((isbn: string) => isbn)
													.join(", ")
											: t("ui.common.none"),
									})}
								</Typography>
								<Typography>
									{t("requesting.issn", {
										issn: data?.clusterDetail.issns
											? data?.clusterDetail.issns
													?.map((issn: string) => issn)
													.join(", ")
											: t("ui.common.none"),
									})}
								</Typography>
							</Stack>
						</Grid>

						<Grid size={{ xs: 4, sm: 8, md: 12, lg: 12 }}>
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
									<Typography variant="h5">
										{data?.clusterDetail.title}
									</Typography>
									<Typography variant="body1" sx={{ my: 2 }}>
										{data?.clusterDetail.description}
									</Typography>

									<Box sx={{ my: 2 }}>
										<CustomLink
											// to="/indexes/$indexCode"
											to="/requesting">
											{/* params={{ indexCode: indexCode }} */}
											{t("requesting.shared_index.return")}
										</CustomLink>
									</Box>

									<pre>{JSON.stringify(data?.clusterDetail, null, 2)}</pre>
								</AccordionDetails>
							</Accordion>
						</Grid>
					</Grid>
				</TabPanel>
				<TabPanel value={1}>
					<Grid
						container
						spacing={{ xs: 2, md: 3 }}
						columns={{ xs: 3, sm: 6, md: 9, lg: 12 }}>
						<Grid size={{ xs: 4, sm: 8, md: 12, lg: 12 }}>
							{responseErrors != null && responseErrors?.length > 0 ? (
								<Grid size={{ xs: 12 }}>
									<Alert severity="error" sx={{ mb: 2 }}>
										<AlertTitle>{t("ui.feedback.error.general")}</AlertTitle>
										{/* Pass the errors array and the translation function */}
										{getAggregatedErrorMessage(responseErrors, t)}
									</Alert>
								</Grid>
							) : null}
							{hasZeroItems ? (
								<Grid size={{ xs: 4, sm: 8, md: 12, lg: 12 }}>
									<Alert severity="info">
										<AlertTitle>{t("ui.feedback.info.general")}</AlertTitle>
										{t("requesting.live_availability_no_items") ||
											"Live availability could not find any items for this record."}
									</Alert>
								</Grid>
							) : null}

							<Stack direction={"column"}>
								{!hasZeroItems ? (
									<Typography variant="h4">
										{t("requesting.shared_index.items_for_cluster", {
											number: itemCount,
										})}
									</Typography>
								) : null}
								{itemsNotShown?.length > 0 ? (
									<Typography variant="h4">
										{t("requesting.shared_index.items_not_shown_long", {
											number: itemsNotShown?.length,
											id: recordId,
										})}
									</Typography>
								) : null}
							</Stack>
						</Grid>
						<Grid size={{ xs: 4, sm: 8, md: 12, lg: 12 }}>
							<DataGrid
								checkboxSelection={false}
								columns={columns}
								disableAggregation={true}
								disableHoverInteractions={true}
								disablePivoting
								disableRowGrouping={true}
								getDetailPanelContent={({ row }: GridRowParams) => (
									<MasterDetail type="items" row={row} />
								)}
								identifier="ClusterRecordItems"
								listViewEnabled={false}
								loading={isLoading}
								noResultsText={t("requesting.items_not_found")}
								pagination
								paginationMode="client"
								paginationModel={{ page: 0, pageSize: 25 }}
								pivotingEnabled={false}
								rows={data?.availability?.itemList ?? []}
								scrollbarVisible={false}
								searchText={t("requesting.items_search")}
								toolbarVisible={true}
								type={"Items"}
								rowCount={
									data?.availability?.itemList
										? data?.availability?.itemList?.length
										: 0
								}
								rowModesModel={{}}
								filterMode="client"
								sortingMode="client"
								sortModel={[{ field: "availabilityDate", sort: "desc" }]}
							/>
						</Grid>
						{itemsNotShown?.length > 0 ? (
							<Grid size={{ xs: 4, sm: 8, md: 12, lg: 12 }}>
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
											disableHoverInteractions={true}
											disablePivoting
											disableRowGrouping={true}
											getDetailPanelContent={({ row }: any) => (
												<MasterDetail type="items" row={row} />
											)}
											identifier="ClusterRecordItemsNotShown"
											loading={isLoading}
											listViewEnabled={false}
											noResultsText={t("requesting.items_not_found")}
											pagination
											paginationMode="client"
											paginationModel={{ page: 0, pageSize: 25 }}
											pivotingEnabled={false}
											scrollbarVisible={false}
											searchText={t("requesting.items_search")}
											toolbarVisible={false}
											rows={itemsNotShown ?? []}
											type={"Items"}
											rowCount={itemsNotShown ? itemsNotShown.length : 0}
											rowModesModel={{}}
											filterMode="client"
											sortingMode="client"
											sortModel={[{ field: "availabilityDate", sort: "desc" }]}
										/>
									</AccordionDetails>
								</Accordion>
							</Grid>
						) : null}
					</Grid>
				</TabPanel>
			</TabContext>
			<CombinedRequestingModal
				show={showCombinedModal}
				onClose={() => setShowCombinedModal(false)}
				bibClusterId={recordId}
				title={data?.clusterDetail.title}
			/>
		</>
	);
}
