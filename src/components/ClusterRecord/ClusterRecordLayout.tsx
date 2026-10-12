import {
	getRouteApi,
	Outlet,
	useNavigate,
	useLocation,
} from "@tanstack/react-router";
import { Tab, Typography, Button, Stack } from "@mui/material";
import TabContext from "@mui/lab/TabContext";
import TabList from "@mui/lab/TabList";
import TabPanel from "@mui/lab/TabPanel";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import CombinedRequestingModal from "@forms/CombinedRequestingModal/CombinedRequestingModal";
import { useClusterDetail } from "@/hooks/useClusterDetail";
import { handleClusterTabChange } from "@helpers/navigation/handleTabChange";

const route = getRouteApi("/__authenticated/requesting/$recordId");

const NO_ITEMS_REASON_ID = "place-request-unavailable";

export default function ClusterRecordLayout() {
	const { recordId } = route.useParams();
	const { t } = useTranslation();
	const navigate = useNavigate();
	const location = useLocation();
	const [showModal, setShowModal] = useState(false);

	const { clusterDetail, items, isLoading } = useClusterDetail(recordId, {
		mode: "all",
	});

	const requestableCount = items?.length ?? 0;
	const canRequest = !isLoading && requestableCount > 0;

	const currentPath = location.pathname;
	let activeTab = "info";
	if (currentPath.endsWith("/items")) activeTab = "items";
	if (currentPath.endsWith("/history")) activeTab = "history";

	return (
		<>
			<Stack
				direction={{ xs: "column", sm: "row" }}
				spacing={1}
				sx={{
					justifyContent: "space-between",
					alignItems: { xs: "flex-start", sm: "center" },
					mb: 2,
				}}>
				{/* Never an empty h1: the page has a heading while the record loads. */}
				<Typography variant="h1" sx={{ mb: 1 }}>
					{clusterDetail?.title ?? t("requesting.cluster")}
				</Typography>
				{/* The reason is TEXT, as on the search result card: a disabled button
				    is not focusable, so a tooltip on it never reaches a keyboard or
				    touch user. */}
				<Stack
					direction="column"
					spacing={0.5}
					sx={{ alignItems: { xs: "flex-start", sm: "flex-end" } }}>
					<Button
						variant="contained"
						color="primary"
						disabled={!canRequest}
						aria-describedby={
							!isLoading && !canRequest ? NO_ITEMS_REASON_ID : undefined
						}
						onClick={() => setShowModal(true)}>
						{t("ui.actions.place_request")}
					</Button>
					{!isLoading && !canRequest ? (
						<Typography
							id={NO_ITEMS_REASON_ID}
							variant="body2"
							color="text.secondary">
							{t("requesting.cannot_request_no_items")}
						</Typography>
					) : null}
				</Stack>
			</Stack>
			<TabContext value={activeTab}>
				<TabList
					aria-label={t("requesting.record_sections")}
					onChange={(event, value) => {
						handleClusterTabChange(event, value, recordId, navigate);
					}}
					variant="scrollable"
					className="secondary">
					<Tab label={t("requesting.record_information")} value="info" />
					<Tab label={t("requesting.items")} value="items" />
					<Tab label={t("requesting.history")} value="history" />
				</TabList>
				<TabPanel value={activeTab}>
					<Outlet />
				</TabPanel>
			</TabContext>
			<CombinedRequestingModal
				show={showModal}
				onClose={() => setShowModal(false)}
				bibClusterId={recordId}
				title={clusterDetail?.title}
			/>
		</>
	);
}
