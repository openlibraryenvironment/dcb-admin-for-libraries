import { useQuery } from "@tanstack/react-query";
import {
	Typography,
	CircularProgress,
	List,
	ListItem,
	ListItemText,
	Box,
	Stack,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import { useRouter } from "@tanstack/react-router";
import dayjs from "dayjs";

interface TopRequestorsSummaryProps {
	headers: Record<string, string>;
	libraryCode: string;
}

export default function TopRequestorsSummary({
	headers,
	libraryCode,
}: TopRequestorsSummaryProps) {
	const { t } = useTranslation();
	const { cfg } = useRouter().options.context as { cfg: any };

	const DCB_API_BASE = cfg.VITE_DCB_API_BASE;

	const { data, isLoading, isError } = useQuery({
		queryKey: ["TopRequestorsSummary", libraryCode, DCB_API_BASE, headers],
		queryFn: async () => {
			const startDate = dayjs()
				.subtract(1, "month")
				.startOf("day")
				.toISOString();
			const endDate = dayjs().toISOString();

			const params = new URLSearchParams({
				libraryCode,
				sort: "active_request_count,desc",
				page: "0",
				size: "10",
				startDate,
				endDate,
			});

			const response = await fetch(
				`${DCB_API_BASE}/patrons/requests/stats/top-requestors?${params}`,
				{
					headers,
				},
			);
			if (!response.ok) {
				throw new Error("Failed to fetch top requestors");
			}
			return response.json();
		},
		enabled: !!libraryCode && !!headers,
	});
	if (!libraryCode || isLoading) {
		return (
			<>
				<Stack alignItems="center" spacing={2}>
					<CircularProgress size="2rem" />
					<Typography variant="body2" color="text.secondary">
						{t("ui.info.wait", "Loading...")}
					</Typography>
				</Stack>
			</>
		);
	}
	if (isError) {
		return (
			<Stack alignItems="center" spacing={1}>
				<ErrorOutlineIcon color="error" fontSize="large" />
				<Typography color="error" variant="body2">
					{t("ui.feedback.error.fetching", "Error fetching data")}
				</Typography>
			</Stack>
		);
	}

	const topRequestorsData = data?.content || [];

	if (topRequestorsData.length === 0) {
		return (
			<>
				<Typography variant="attributeTitle">
					{t("library.statistics.top_requesters_month")}
				</Typography>
				<Typography variant="body2">
					{t("library.statistics.no_requesters")}
				</Typography>
			</>
		);
	}

	return (
		<>
			<List dense disablePadding>
				{topRequestorsData.map((item: any, index: number) => (
					<ListItem
						key={`top-requestor-${index}`}
						disableGutters
						divider={index !== topRequestorsData.length - 1}
						sx={{ py: 0.5 }}>
						<ListItemText
							primary={
								<Typography variant="body2">
									{item.patronBarcode ||
										t("library.statistics.unknown_patron", "Unknown Patron")}
								</Typography>
							}
						/>
						<Box display="flex" alignItems="center" ml={2}>
							<Typography variant="body2" fontWeight="bold">
								{item.activeRequestCount}
							</Typography>
						</Box>
					</ListItem>
				))}
			</List>
		</>
	);
}
