import { OPTIONAL_QUERY } from "@helpers/serviceErrors";
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
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutlined";
import { useRouter } from "@tanstack/react-router";
import dayjs from "dayjs";
import { leaderboardUrl } from "@helpers/statsApi";
import { isInsightsEnabled } from "@helpers/featureFlags";
import { authHeaders } from "@helpers/auth";
import { queryKeys } from "@helpers/queryKeys";

interface TopRequestorsSummaryProps {
	libraryCode: string;
}

export default function TopRequestorsSummary({
	libraryCode,
}: TopRequestorsSummaryProps) {
	const { t } = useTranslation();
	const { cfg } = useRouter().options.context as { cfg: any };

	const DCB_API_BASE = cfg.VITE_DCB_API_BASE;

	const { data, isLoading, isError } = useQuery({
		queryKey: queryKeys.insights.topRequestors(DCB_API_BASE, libraryCode),
		meta: OPTIONAL_QUERY,
		queryFn: async () => {
			const startDate = dayjs()
				.subtract(1, "month")
				.startOf("day")
				.toISOString();
			const endDate = dayjs().toISOString();

			const url = leaderboardUrl(
				DCB_API_BASE,
				"top-requestors",
				{ sort: "active_request_count,desc", page: "0", size: "10", startDate, endDate },
				libraryCode,
				isInsightsEnabled(),
			);

			const response = await fetch(
				url,
				{
					headers: await authHeaders(),
				},
			);
			if (!response.ok) {
				throw new Error("Failed to fetch top requestors");
			}
			return response.json();
		},
		enabled: !!libraryCode,
	});
	if (!libraryCode || isLoading) {
		return (
            <>
                <Stack spacing={2} sx={{
                    alignItems: "center"
                }}>
					{/* Named from the visible text - see TopTitlesSummary. */}
					<CircularProgress
						size="2rem"
						aria-labelledby="top-requestors-loading"
					/>
					<Typography id="top-requestors-loading" variant="body2" sx={{
                        color: "text.secondary"
                    }}>
						{t("ui.info.wait", "Loading...")}
					</Typography>
				</Stack>
            </>
        );
	}
	if (isError) {
		return (
            <Stack spacing={1} sx={{
                alignItems: "center"
            }}>
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
			<Typography variant="body2">
				{t("library.statistics.no_requesters")}
			</Typography>
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
						<Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                ml: 2
                            }}>
							<Typography variant="body2" sx={{
                                fontWeight: "bold"
                            }}>
								{item.activeRequestCount}
							</Typography>
						</Box>
					</ListItem>
				))}
			</List>
        </>
    );
}
