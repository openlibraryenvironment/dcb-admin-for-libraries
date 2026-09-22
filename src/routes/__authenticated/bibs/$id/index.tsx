import { Attribute } from "@components/Attribute/Attribute";
import { pageTitle } from "@helpers/pageTitle";
import Error from "@components/Error/Error";
import Loading from "@components/Loading/Loading";
import RenderAttribute from "@components/RenderAttribute/RenderAttribute";
import { BibsQueryData } from "@models/ReactQueryHelperTypes";
import { ExpandMoreOutlined } from "@mui/icons-material";
import { Accordion, AccordionDetails, AccordionSummary } from "@mui/material";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import { getBibMainDetails } from "@queries/getBib";
import { getBibSourceRecord } from "@queries/getBibSourceRecord";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import dayjs from "dayjs";
import request from "graphql-request";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "react-oidc-context";

export const Route = createFileRoute("/__authenticated/bibs/$id/")({
	head: () => ({ meta: [{ title: pageTitle("bibs.title") }] }),
	component: RouteComponent,
});

function RouteComponent() {
	const { t } = useTranslation();
	const auth = useAuth();

	const { id } = Route.useParams();

	const { cfg } = useRouter().options.context as { cfg: any };
	const DCB_API_BASE = cfg.VITE_DCB_API_BASE + "/graphql";
	const headers = useMemo(
		() => ({ Authorization: `Bearer ${auth.user?.access_token}` }),
		[auth.user?.access_token]
	);
	const [isSourceExpanded, setIsSourceExpanded] = useState(false);
	const [isCanonicalExpanded, setIsCanonicalExpanded] = useState(false);

	const {
		data: bibData,
		isLoading: bibDataLoading,
		isError: bibDataError,
	} = useQuery<BibsQueryData>({
		queryKey: ["bibRecord", id, headers, DCB_API_BASE],
		queryFn: async () =>
			request(
				DCB_API_BASE,
				getBibMainDetails,
				{
					query: "id:" + id,
					pagesize: 10,
					pageno: 0,
					orderBy: "lastUpdated",
					order: "ASC",
				},
				headers
			),
		enabled: !!auth.user,
	});

	const {
		data: sourceData,
		isLoading: isSourceLoading,
		isError: isSourceError,
	} = useQuery<BibsQueryData>({
		queryKey: ["bib", "sourceRecord", id, DCB_API_BASE, headers],
		queryFn: async () =>
			request(DCB_API_BASE, getBibSourceRecord, { query: "id:" + id }, headers),
		enabled: !!auth.user && !!id && isSourceExpanded,
	});
	const bibRecord = bibData?.sourceBibs?.content?.[0];

	const sourceRecord = sourceData?.sourceBibs?.content?.[0]?.sourceRecord;

	const handleAccordionChange = (
		_: React.SyntheticEvent,
		expanded: boolean
	) => {
		setIsSourceExpanded(expanded);
	};

	const handleCanonicalAccordionChange = (
		_: React.SyntheticEvent,
		expanded: boolean
	) => {
		setIsCanonicalExpanded(expanded);
	};

	if (bibDataLoading) {
		return (
			<Loading
				title={t("ui.info.loading.document", {
					document_type: t("bibs.title").toLowerCase(),
				})}
				subtitle={t("ui.info.wait")}
			/>
		);
	}

	if (bibDataError || !bibData) {
		return (
			<Error
				title={
					bibDataError
						? t("ui.feedback.error.cannot_retrieve_record")
						: t("ui.feedback.error.cannot_find_record")
				}
				message={
					bibDataError
						? t("ui.info.connection_issue")
						: t("ui.feedback.error.invalid_UUID")
				}
				action={t("ui.actions.go_back")}
				goBack="/bibs"
			/>
		);
	}

	return (
		<Grid
			container
			spacing={{ xs: 2, md: 3 }}
			columns={{ xs: 3, sm: 6, md: 9, lg: 12 }}>
			<Grid size={{ xs: 4, sm: 8, md: 12 }}>
				<Typography variant="h1">{bibRecord?.title}</Typography>
			</Grid>
			<Grid size={{ xs: 2, sm: 4, md: 4 }}>
				<Attribute label={t("bibs.author")}>
					<RenderAttribute attribute={bibRecord?.author} />
				</Attribute>
			</Grid>
			<Grid size={{ xs: 2, sm: 4, md: 4 }}>
				<Attribute label={t("bibs.date_created")}>
					<RenderAttribute
						attribute={dayjs(bibRecord?.dateCreated).format("YYYY-MM-DD HH:mm")}
					/>
				</Attribute>
			</Grid>
			<Grid size={{ xs: 2, sm: 4, md: 4 }}>
				<Attribute label={t("bibs.date_updated")}>
					<RenderAttribute
						attribute={dayjs(bibRecord?.dateUpdated).format("YYYY-MM-DD HH:mm")}
					/>
				</Attribute>
			</Grid>
			<Grid size={{ xs: 2, sm: 4, md: 4 }}>
				<Attribute label={t("bibs.publisher")}>
					<RenderAttribute attribute={bibRecord?.publisher} />
				</Attribute>
			</Grid>
			<Grid size={{ xs: 2, sm: 4, md: 4 }}>
				<Attribute label={t("bibs.place_of_publication")}>
					<RenderAttribute attribute={bibRecord?.placeOfPublication} />
				</Attribute>
			</Grid>
			<Grid size={{ xs: 2, sm: 4, md: 4 }}>
				<Attribute label={t("bibs.date_of_publication")}>
					<RenderAttribute
						attribute={dayjs(bibRecord?.dateOfPublication).format(
							"YYYY-MM-DD HH:mm"
						)}
					/>
				</Attribute>
			</Grid>
			<Grid size={{ xs: 2, sm: 4, md: 4 }}>
				<Attribute label={t("bibs.edition")}>
					<RenderAttribute attribute={bibRecord?.edition} />
				</Attribute>
			</Grid>
			<Grid size={{ xs: 2, sm: 4, md: 4 }}>
				<Attribute label={t("bibs.large_print")}>
					<RenderAttribute attribute={bibRecord?.isLargePrint} />
				</Attribute>
			</Grid>
			<Grid size={{ xs: 2, sm: 4, md: 4 }}>
				<Attribute label={t("bibs.source_system_id")}>
					<RenderAttribute attribute={bibRecord?.sourceSystemId} />
				</Attribute>
			</Grid>
			<Grid size={{ xs: 2, sm: 4, md: 4 }}>
				<Attribute label={t("bibs.source_record_id")}>
					<RenderAttribute attribute={bibRecord?.sourceRecordId} />
				</Attribute>
			</Grid>
			<Grid size={{ xs: 2, sm: 4, md: 4 }}>
				<Attribute label={t("bibs.process_version")}>
					<RenderAttribute attribute={bibRecord?.processVersion} />
				</Attribute>
			</Grid>
			<Grid size={{ xs: 2, sm: 4, md: 4 }}>
				<Attribute label={t("bibs.metadata_score")}>
					<RenderAttribute attribute={bibRecord?.metadataScore} />
				</Attribute>
			</Grid>
			<Grid size={{ xs: 2, sm: 4, md: 4 }}>
				<Attribute label={t("bibs.id")}>
					<RenderAttribute attribute={bibRecord?.id} />
				</Attribute>
			</Grid>
			<Grid size={{ xs: 2, sm: 4, md: 4 }}>
				<Attribute label={t("bibs.cluster_uuid")}>
					<RenderAttribute attribute={bibRecord?.contributesTo?.id} />
				</Attribute>
			</Grid>
			<Grid size={{ xs: 4, sm: 8, md: 12 }}>
				<Accordion
					expanded={isCanonicalExpanded}
					onChange={handleCanonicalAccordionChange}
					disableGutters
					variant="outlined">
					<AccordionSummary
						expandIcon={<ExpandMoreOutlined />}
						aria-controls="canonical-metadata-content"
						id="canonical-metadata-header">
						<Typography variant="h3" sx={{ fontWeight: "bold" }}>
							{t("bibs.canonical_metadata")}
						</Typography>
					</AccordionSummary>
					<AccordionDetails>
						<pre>{JSON.stringify(bibRecord?.canonicalMetadata, null, 2)}</pre>
					</AccordionDetails>
				</Accordion>
			</Grid>
			<Grid size={{ xs: 4, sm: 8, md: 12 }}>
				<Accordion
					expanded={isSourceExpanded}
					onChange={handleAccordionChange}
					disableGutters
					variant="outlined">
					<AccordionSummary
						expandIcon={<ExpandMoreOutlined />}
						aria-controls="source-record-content"
						id="source-record-header">
						<Typography variant="h3" sx={{ fontWeight: "bold" }}>
							{t("bibs.source_record")}
						</Typography>
					</AccordionSummary>
					<AccordionDetails>
						{isSourceError ? (
							t("bibs.source_error")
						) : isSourceLoading ? (
							<Loading
								title={t("ui.info.loading.document", {
									document_type: t("bibs.source_record").toLowerCase(),
								})}
								subtitle={t("ui.info.wait")}
							/>
						) : (
							<pre>{JSON.stringify(sourceRecord, null, 2)}</pre>
						)}
					</AccordionDetails>
				</Accordion>
			</Grid>
		</Grid>
	);
}
