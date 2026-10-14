import { useClock } from "@/hooks/useThemeStore";
import { formatTimestamp } from "@helpers/formatters";
import { Attribute } from "@components/Attribute/Attribute";
import { pageTitle } from "@helpers/pageTitle";
import Error from "@components/Error/Error";
import Loading from "@components/Loading/Loading";
import RenderAttribute from "@components/RenderAttribute/RenderAttribute";
import { BibsQueryData } from "@models/ReactQueryHelperTypes";
import { ExpandMoreOutlined } from "@mui/icons-material";
import {
	Accordion,
	AccordionDetails,
	AccordionSummary,
	Box,
	CircularProgress,
} from "@mui/material";
import { isUuidShaped } from "@helpers/isUuidShaped";
import { DETAIL_COLUMNS, FULL_ROW, WRAPPED_PRE } from "@constants/detailGrid";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import { getBibMainDetails } from "@queries/getBib";
import { getBibSourceRecord } from "@queries/getBibSourceRecord";
import { queryKeys } from "@helpers/queryKeys";
import { authHeaders } from "@helpers/auth";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import request from "graphql-request";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "react-oidc-context";

export const Route = createFileRoute("/__authenticated/bibs/$id/")({
	head: () => ({ meta: [{ title: pageTitle("bibs.title") }] }),
	component: RouteComponent,
});

function RouteComponent() {
	const { t } = useTranslation();
	const clock = useClock();
	const auth = useAuth();

	const { id } = Route.useParams();
	const isValidId = isUuidShaped(id);

	const { cfg } = useRouter().options.context as { cfg: any };
	const apiBase = cfg.VITE_DCB_API_BASE;
	const [isSourceExpanded, setIsSourceExpanded] = useState(false);
	const [isCanonicalExpanded, setIsCanonicalExpanded] = useState(false);

	const {
		data: bibData,
		isLoading: bibDataLoading,
		isError: bibDataError,
	} = useQuery<BibsQueryData>({
		queryKey: queryKeys.bibs.detail(apiBase, id),
		queryFn: async () =>
			request(
				apiBase + "/graphql",
				getBibMainDetails,
				{
					query: "id:" + id,
					pagesize: 10,
					pageno: 0,
				},
				await authHeaders()
			),
		enabled: !!auth.user && isValidId,
	});

	const {
		data: sourceData,
		isLoading: isSourceLoading,
		isError: isSourceError,
	} = useQuery<BibsQueryData>({
		queryKey: queryKeys.bibs.sourceRecord(apiBase, id),
		queryFn: async () =>
			request(
				apiBase + "/graphql",
				getBibSourceRecord,
				{ query: "id:" + id },
				await authHeaders()
			),
		enabled: !!auth.user && isValidId && isSourceExpanded,
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

	if (bibDataError || !bibRecord) {
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
			columns={DETAIL_COLUMNS}>
			<Grid size={FULL_ROW}>
				<Typography variant="h1">{bibRecord.title || t("bibs.title")}</Typography>
			</Grid>
			<Grid size={{ xs: 2, sm: 4, md: 4 }}>
				<Attribute label={t("bibs.author")}>
					<RenderAttribute attribute={bibRecord?.author} />
				</Attribute>
			</Grid>
			<Grid size={{ xs: 2, sm: 4, md: 4 }}>
				<Attribute label={t("bibs.date_created")}>
					<RenderAttribute
						attribute={formatTimestamp(bibRecord?.dateCreated, clock)}
					/>
				</Attribute>
			</Grid>
			<Grid size={{ xs: 2, sm: 4, md: 4 }}>
				<Attribute label={t("bibs.date_updated")}>
					<RenderAttribute
						attribute={formatTimestamp(bibRecord?.dateUpdated, clock)}
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
					<RenderAttribute attribute={bibRecord?.dateOfPublication} />
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
			<Grid size={FULL_ROW}>
				<Accordion
					expanded={isCanonicalExpanded}
					onChange={handleCanonicalAccordionChange}
					disableGutters
					variant="outlined"
					slotProps={{ heading: { component: "h2" } }}>
					<AccordionSummary
						expandIcon={<ExpandMoreOutlined />}
						aria-controls="canonical-metadata-content"
						id="canonical-metadata-header">
						<Typography variant="h3" component="span" sx={{ fontWeight: "bold" }}>
							{t("bibs.canonical_metadata")}
						</Typography>
					</AccordionSummary>
					<AccordionDetails>
						<Box component="pre" sx={WRAPPED_PRE}>
							{JSON.stringify(bibRecord?.canonicalMetadata, null, 2)}
						</Box>
					</AccordionDetails>
				</Accordion>
			</Grid>
			<Grid size={FULL_ROW}>
				<Accordion
					expanded={isSourceExpanded}
					onChange={handleAccordionChange}
					disableGutters
					variant="outlined"
					slotProps={{ heading: { component: "h2" } }}>
					<AccordionSummary
						expandIcon={<ExpandMoreOutlined />}
						aria-controls="source-record-content"
						id="source-record-header">
						<Typography variant="h3" component="span" sx={{ fontWeight: "bold" }}>
							{t("bibs.source_record")}
						</Typography>
					</AccordionSummary>
					<AccordionDetails>
						{isSourceError ? (
							t("bibs.source_error")
						) : isSourceLoading ? (
							<CircularProgress
								size="1.5rem"
								aria-label={t("ui.info.loading.document", {
									document_type: t("bibs.source_record").toLowerCase(),
								})}
							/>
						) : (
							<Box component="pre" sx={WRAPPED_PRE}>
								{JSON.stringify(sourceRecord, null, 2)}
							</Box>
						)}
					</AccordionDetails>
				</Accordion>
			</Grid>
		</Grid>
	);
}
