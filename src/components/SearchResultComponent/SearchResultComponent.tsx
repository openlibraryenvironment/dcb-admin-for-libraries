import { useItemAvailability } from "@/hooks/useItemAvailability";
import { CustomLink } from "@components/CustomLink";
import { Button, CardActions, Link, Tooltip } from "@mui/material";
import Card from "@mui/material/Card";
import Skeleton from "@mui/material/Skeleton";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { GridRenderCellParams } from "@mui/x-data-grid-premium";
import { useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Contributor } from "@models/ClusterDetailResponse";

interface SearchResultProps {
	params: GridRenderCellParams;
	indexCode: string;
}
// Key information for this component to display - note that description might change
// Title, Author, Format, Description, ISBN (or other identifier)
// Bonus info
// Language, No. of available items, Publisher, Top Subjects, Publication Date,, Series etc ..
// Note that a lot of the above belongs more on the individual record page. Which also needs a re-work and componentisation

// Potential actions
// One-click request button IF we can check live availability sensibly (to grey it out if no items are available)
export const SearchResult = ({ params, indexCode }: SearchResultProps) => {
	const { cfg } = useRouter().options.context as { cfg: any };
	const recordId = params?.row?.id;

	const cardRef = useRef<HTMLDivElement | null>(null);
	const { t } = useTranslation();
	const [showAllLocations, setShowAllLocations] = useState(false); // State for Change 3

	const {
		data: availability,
		isLoading,
		refetch,
		isFetched, // Use isFetched to prevent re-fetching
	} = useItemAvailability(recordId, cfg.VITE_DCB_API_BASE);

	// This is to find intersecting elements. If it's visible, let's fetch. If it's not, we don't care.
	// This is to stop us hitting live availability for a hundred items at once.
	useEffect(() => {
		const element = cardRef.current;

		const observer = new IntersectionObserver(
			([entry]) => {
				// When the element is intersecting (visible) and hasn't been fetched yet
				if (entry.isIntersecting && !isFetched) {
					refetch();
					// Stop observing the element so it only fetches once
					if (element) {
						observer.unobserve(element);
					}
				}
			},
			{ threshold: 0.1 } // Fire when 10% of the element is visible
		);

		if (element) {
			observer.observe(element);
		}

		//Cleanup function to disconnect the observer when the component unmounts
		return () => {
			if (element) {
				observer.unobserve(element);
			}
		};
	}, [refetch, isFetched]);

	const requestableCount = availability?.itemList?.length;
	const canRequest = requestableCount !== undefined && requestableCount > 0;

	const allLocationNames = availability?.timings
		? Object.keys(availability.timings).filter((key) => key !== "total")
		: [];
	const locationCount = allLocationNames.length;

	// May end up doing "Available at, X, Y Z", "Present at X, Y, Z"M- available at could have green tick

	// const fetchItemAvailability = useCallback(async () => {
	// 	const response = await axios.get(
	// 		`${cfg.VITE_DCB_API_BASE}/items/availability`,
	// 		{
	// 			params: {
	// 				clusteredBibId: recordId,
	// 			},
	// 		}
	// 	);
	// 	return response.data;
	// }, [recordId, cfg.VITE_DCB_API_BASE]);
	// May be best to say "Present at X locations and add tooltip"
	// Then we can explain the difference
	// Present at x, available to request at X 'at a glance'
	// Then go into more detail
	return (
		// <Box width="100%" mb={2} p={0} m={0}>
		<Card
			variant="outlined"
			ref={cardRef}
			elevation={4}
			sx={{
				backgroundColor: "var(--mui-palette-primary-searchResultBackground)",
			}}>
			{/** Gives us the drop shadow and the background colour */}
			<CardContent>
				<Stack direction={"column"} spacing={0.5}>
					<Typography
						variant="h6"
						color="var(--mui-palette-primary-searchResultTitle)">
						<CustomLink
							to="/indexes/$indexCode/$recordId"
							params={{ indexCode: indexCode, recordId: params.row.id }}>
							{params.row.title}
						</CustomLink>
					</Typography>
					<Typography
						variant="body2"
						color="text.secondary"
						fontWeight={"bold"}
						mb={2}>
						{t("requesting.format", {
							formats: params.row.sourceTypes?.join(","),
						})}{" "}
					</Typography>
					<Typography
						variant="body2"
						color="text.secondary"
						fontWeight={"bold"}>
						{t("requesting.contributor", {
							contributors: params.row.contributors
								?.map((c: Contributor) => c.name)
								.join(", "),
						})}
					</Typography>
					<Typography
						variant="body2"
						color="text.secondary"
						fontWeight={"bold"}>
						{t("requesting.publication_date", {
							publicationDate: params?.row?.publicationDate
								? params?.row?.publicationDate
								: params.row.publication
										?.map(
											(pub: { publisher: string; dateOfPublication: string }) =>
												pub.publisher + " " + pub.dateOfPublication
										)
										.join(", "),
						})}
					</Typography>
					<Typography variant="body2">{params.row.description}</Typography>
				</Stack>

				<Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap mb={2}>
					{params.row.subjects?.map((sub: { value: string }, index: bigint) => (
						<Chip
							key={params.row.id + "." + index + "." + sub.value}
							label={sub.value}
						/>
					))}
				</Stack>
				<Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap mb={2}>
					{params.row.isbns?.map((isbn: string, index: bigint) => (
						<Chip
							key={params.row.id + "." + index + "." + isbn}
							label={`isbn ${isbn}`}
						/>
					))}
					{params.row.issns?.map((issn: string, index: bigint) => (
						<Chip
							key={params.row.id + "." + index + "." + issn}
							label={`issn ${issn}`}
						/>
					))}
				</Stack>
			</CardContent>
			{/** We might be able to use this pattern elsewhere to reduce server load */}
			<CardActions sx={{ padding: "16px" }}>
				{isLoading ? (
					<Skeleton variant="text" width={180} height={24} />
				) : (
					<Stack direction={"column"} spacing={1}>
						<Typography variant="body2" sx={{ flexGrow: 1 }}>
							{requestableCount !== undefined
								? t("requesting.available_to_request", {
										number: requestableCount,
									})
								: t("requesting.live_availability_unavailable")}
						</Typography>
						{/* <Typography variant="hitCount">
							{t("requesting.available_at", {
								total: availability?.timings?.size ?? 0,
								list: locationNames,
							})}
						</Typography> */}
						<Typography variant="hitCount">
							{t("requesting.available_at", {
								total: locationCount /* Change 1: Use correct count */,
							})}
							{locationCount > 0 && ": "}
							{/* Change 3: Truncate list if longer than 2 */}
							{locationCount > 2 && !showAllLocations ? (
								<>
									{`${allLocationNames.slice(0, 2).join(", ")} `}
									<Tooltip title={allLocationNames.slice(2).join(", ")}>
										<Link
											component="button"
											variant="body2"
											onClick={() => setShowAllLocations(true)}
											sx={{ verticalAlign: "baseline" }}>
											{t("ui.feedback.reveal_more", {
												number: locationCount - 2,
											})}
										</Link>
									</Tooltip>
								</>
							) : (
								<>
									{allLocationNames.join(", ") + " "}
									{locationCount > 2 && showAllLocations && (
										<>
											<Link
												component="button"
												variant="body2"
												onClick={() => setShowAllLocations(false)}
												sx={{ verticalAlign: "baseline" }}>
												{t("ui.feedback.show_less")}
											</Link>
										</>
									)}
								</>
							)}
						</Typography>
					</Stack>
				)}
				<div style={{ flex: "1 0 0" }} />
				{/** This needs to be pushed back to the right */}
				<Tooltip
					title={!canRequest ? t("requesting.cannot_request_no_items") : ""}>
					<span>
						<Button variant="contained" color="primary" disabled={!canRequest}>
							{t("ui.actions.place_request")}
						</Button>
					</span>
				</Tooltip>
			</CardActions>
		</Card>
		// </Box>
	);
};
