import Box from "@mui/material/Box";
import {
	Typography,
	Accordion,
	AccordionSummary,
	AccordionDetails,
	Stack,
	Grid,
	Chip,
} from "@mui/material";

import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { CustomLink } from "../CustomLink";
import { Contributor, Note } from "@models/ClusterDetailResponse";
import { useTranslation } from "react-i18next";
import Loading from "../../components/Loading/Loading";
import Error from "../../components/Error/Error";
// import { Route } from "@/routes/__authenticated/indexes/$indexCode/$recordId";
import { Route } from "@/routes/__authenticated/requesting/$recordId";
import RenderAttribute from "@components/RenderAttribute/RenderAttribute";
import { useClusterDetail } from "@/hooks/useClusterDetail";
import { Section } from "@components/Section/Section";
import { useState } from "react";

// Key info for this component
// Title, Author, Format, Description, ISBN (or other identifier)
// Bonus info
// Language, No. of available items, Publisher, Top Subjects, Publication Date etc ..
// Everything on the search result and more
// Must be a schema in dcb-locate somewhere
// Then we also need to think about graphql - can we query clusters by their source systems ...

export default function ClusterRecordComponent() {
	const { recordId } = Route.useParams();
	const { t } = useTranslation();
	const [isAccordionExpanded, setIsAccordionExpanded] = useState(false);
	const { clusterDetail, isLoading, isError } = useClusterDetail(recordId, {
		mode: "info",
	});

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

	return (
		<Grid
			container
			spacing={{ xs: 2, md: 3 }}
			columns={{ xs: 3, sm: 6, md: 9, lg: 12 }}>
			<Grid
				container
				spacing={{ xs: 2, md: 3 }}
				columns={{ xs: 3, sm: 6, md: 9, lg: 12 }}>
				<Grid size={{ xs: 2, sm: 4, md: 4 }}>
					<Section
						title={t("requesting.contributors")}
						children={clusterDetail?.contributors
							?.map((c: Contributor) => c.name)
							.join(", ")}
					/>
				</Grid>
				<Grid size={{ xs: 2, sm: 4, md: 4 }}>
					<Section
						title={t("requesting.format_title")}
						children={
							<Typography>{clusterDetail?.sourceTypes?.join(",")}</Typography>
						}
					/>
				</Grid>
				<Grid size={{ xs: 2, sm: 4, md: 4 }}>
					<Section
						title={t("requesting.publication_year")}
						children={
							<RenderAttribute attribute={clusterDetail?.publicationYear} />
						}
					/>
				</Grid>
				<Grid size={{ xs: 2, sm: 4, md: 4 }}>
					<Section
						title={t("requesting.description")}
						children={
							<RenderAttribute attribute={clusterDetail?.description} />
						}
					/>
				</Grid>
				<Grid size={{ xs: 2, sm: 4, md: 4 }}>
					<Section
						title={t("requesting.languages")}
						children={
							<Typography>{clusterDetail?.languages?.join(",")}</Typography>
						}
					/>
				</Grid>
				<Grid size={{ xs: 2, sm: 4, md: 4 }}>
					<Section
						title={t("requesting.publisher")}
						children={clusterDetail?.publication
							?.map((pub: { publisher: string }) => pub.publisher)
							.join(", ")}
					/>
				</Grid>
				<Grid size={{ xs: 2, sm: 4, md: 4 }}>
					<Section
						title={t("requesting.physical_descriptions")}
						children={clusterDetail?.physicalDescriptions}
					/>
				</Grid>
				<Grid size={{ xs: 2, sm: 4, md: 4 }}>
					<Section
						title={t("requesting.notes")}
						children={clusterDetail?.notes
							?.map(
								(note: { labelKey: string; note: string }) =>
									note.labelKey + ": " + note.note,
							)
							.join(", ")}
					/>
				</Grid>
				<Grid size={{ xs: 4, sm: 8, md: 12, lg: 12 }}>
					<Section
						title={t("requesting.subjects")}
						children={
							<Stack
								direction="row"
								spacing={1}
								flexWrap="wrap"
								useFlexGap
								mb={2}>
								{clusterDetail?.subjects?.map(
									(sub: { value: string }, index: number) => (
										<Chip
											key={clusterDetail?.id + "." + index + "." + sub.value}
											label={sub.value}
										/>
									),
								)}
							</Stack>
						}
					/>
				</Grid>
				<Grid size={{ xs: 4, sm: 8, md: 12, lg: 12 }}>
					<Section
						title={t("requesting.series")}
						children={
							<Stack
								direction="row"
								spacing={1}
								flexWrap="wrap"
								useFlexGap
								mb={2}>
								{clusterDetail?.series?.map(
									(sub: { value: string }, index: number) => (
										<Chip
											key={clusterDetail?.id + "." + index + "." + sub.value}
											label={sub.value}
										/>
									),
								)}
							</Stack>
						}
					/>
				</Grid>
				<Grid size={{ xs: 4, sm: 8, md: 12, lg: 12 }}>
					<Section
						title={t("requesting.notes")}
						children={
							<Stack
								direction="row"
								spacing={1}
								flexWrap="wrap"
								useFlexGap
								mb={2}>
								{clusterDetail?.notes?.map((note: Note, index: number) => (
									<Chip
										key={clusterDetail?.id + "." + index + "." + note.note}
										label={note.labelKey + ": " + note.note}
									/>
								))}
							</Stack>
						}
					/>
				</Grid>
				<Grid size={{ xs: 4, sm: 8, md: 12, lg: 12 }}>
					<Section
						title={
							<Typography variant="attributeTitle">
								{t("requesting.identifiers")}
							</Typography>
						}
						children={
							<>
								<Typography>
									{t("requesting.isbn", {
										isbn: clusterDetail?.isbns
											? clusterDetail?.isbns
													?.map((isbn: string) => isbn)
													.join(", ")
											: t("ui.common.none"),
									})}
								</Typography>
								<Typography>
									{t("requesting.issn", {
										issn: clusterDetail?.issns
											? clusterDetail.issns
													?.map((issn: string) => issn)
													.join(", ")
											: t("ui.common.none"),
									})}
								</Typography>
							</>
						}
					/>
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
							<Typography variant="h5">{clusterDetail?.title}</Typography>
							<Typography variant="body1" sx={{ my: 2 }}>
								{clusterDetail?.description}
							</Typography>

							<Box sx={{ my: 2 }}>
								<CustomLink
									// to="/indexes/$indexCode"
									to="/requesting">
									{/* params={{ indexCode: indexCode }} */}
									{t("requesting.shared_index.return")}
								</CustomLink>
							</Box>

							<pre>{JSON.stringify(clusterDetail, null, 2)}</pre>
						</AccordionDetails>
					</Accordion>
				</Grid>
			</Grid>
		</Grid>
	);
}
