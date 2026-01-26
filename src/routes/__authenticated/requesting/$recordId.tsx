import {
	createFileRoute,
	Outlet,
	useNavigate,
	useLocation,
} from "@tanstack/react-router";
import { Tab, Typography, Button, Stack, Tooltip } from "@mui/material";
import TabContext from "@mui/lab/TabContext";
import TabList from "@mui/lab/TabList";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import CombinedRequestingModal from "@forms/CombinedRequestingModal/CombinedRequestingModal";
import { useClusterDetail } from "@/hooks/useClusterDetail";
import { handleClusterTabChange } from "@helpers/navigation/handleTabChange";
import TabPanel from "@mui/lab/TabPanel";

export const Route = createFileRoute("/__authenticated/requesting/$recordId")({
	component: RequestingLayout,
});

function RequestingLayout() {
	const { recordId } = Route.useParams();
	const { t } = useTranslation();
	const navigate = useNavigate();
	const location = useLocation();
	const [showModal, setShowModal] = useState(false);

	const { clusterDetail, items, isLoading } = useClusterDetail(recordId, {
		mode: "all",
	});

	const requestableCount = items?.length ?? 0;
	// You can request if there are items and if it's not loading
	const canRequest = !isLoading && requestableCount > 0;
	console.log(clusterDetail);

	const currentPath = location.pathname;
	let activeTab = "info";
	if (currentPath.endsWith("/items")) activeTab = "items";
	if (currentPath.endsWith("/history")) activeTab = "history";

	return (
		<>
			<Stack
				direction="row"
				justifyContent="space-between"
				alignItems="center"
				sx={{ mb: 2 }}>
				<Typography variant="h1" mb={1}>
					{clusterDetail?.title}
				</Typography>
				<Tooltip
					title={!canRequest ? t("requesting.cannot_request_no_items") : ""}>
					<span>
						<Button
							variant="contained"
							color="primary"
							disabled={!canRequest}
							onClick={() => setShowModal(true)}>
							{t("ui.actions.place_request")}
						</Button>
					</span>
				</Tooltip>
			</Stack>
			<TabContext value={activeTab}>
				<TabList
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
