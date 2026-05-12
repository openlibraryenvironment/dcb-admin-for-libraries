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

interface TopTitlesSummaryProps {
	headers: Record<string, string>;
	libraryCode: string;
}

export default function TopTitlesSummary({
	headers,
	libraryCode,
}: TopTitlesSummaryProps) {
	const { t } = useTranslation();
	const { cfg } = useRouter().options.context as { cfg: any };

	const DCB_API_BASE = cfg.VITE_DCB_API_BASE;

	const { data, isLoading, isError } = useQuery({
		queryKey: ["TopRequestedTitlesSummary", libraryCode, DCB_API_BASE, headers],
		queryFn: async () => {
			const startDate = dayjs()
				.subtract(1, "month")
				.startOf("day")
				.toISOString();
			const endDate = dayjs().toISOString();
			const params = new URLSearchParams({
				libraryCode,
				sort: "request_count,desc",
				page: "0",
				size: "10",
				startDate,
				endDate,
			});

			const response = await fetch(
				`${DCB_API_BASE}/patrons/requests/stats/top-requested-titles?${params}`,
				{
					headers,
				},
			);
			if (!response.ok) {
				throw new Error("Failed to fetch top titles");
			}
			return response.json();
		},
		enabled: !!libraryCode && !!headers,
	});

	if (!libraryCode || isLoading) {
		return (
			<Stack alignItems="center" spacing={2}>
				<CircularProgress size="2rem" />
				<Typography variant="body2" color="text.secondary">
					{t("ui.info.wait", "Loading...")}
				</Typography>
			</Stack>
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

	const topRequestedTitlesData = data?.content || [];

	if (topRequestedTitlesData.length === 0) {
		return (
			<>
				<Typography variant="attributeTitle">
					{t("library.statistics.top_titles_month")}
				</Typography>
				<Typography variant="body2">
					{t("library.statistics.no_titles")}
				</Typography>
			</>
		);
	}

	return (
		<>
			<List dense disablePadding>
				{topRequestedTitlesData.map((item: any, index: number) => (
					<ListItem
						key={`top-title-${index}`}
						disableGutters
						divider={index !== topRequestedTitlesData.length - 1}
						sx={{ py: 0.5 }}>
						<ListItemText
							primary={
								<Typography variant="body2">
									{/* sx={{ fontWeight: 500, lineHeight: 1.2 }}> */}
									{item.title}
								</Typography>
							}
						/>
						<Box display="flex" alignItems="center" ml={2}>
							<Typography variant="body2" fontWeight="bold">
								{item.requestCount}
							</Typography>
						</Box>
					</ListItem>
				))}
			</List>
		</>
	);
}
