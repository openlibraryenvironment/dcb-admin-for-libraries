import { Attribute } from "@components/Attribute/Attribute";
import {
	Accordion,
	AccordionDetails,
	AccordionSummary,
	List,
	ListItem,
	ListItemText,
	Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import { CustomLink } from "@components/CustomLink";
import { GridApiPremium, useGridApiContext } from "@mui/x-data-grid-premium";
import { useTranslation } from "react-i18next";
import { RefObject, useCallback, useEffect, useState } from "react";
import RenderAttribute from "../RenderAttribute/RenderAttribute";
import MasterDetailLayout from "./MasterDetailLayout";
import ExpandMore from "@mui/icons-material/ExpandMore";
import ChangesSummary from "../ChangesSummary/ChangesSummary";
import dayjs from "dayjs";

interface MasterDetailType {
	row: any;
	type: string;
}

export default function MasterDetail({ row, type }: MasterDetailType) {
	const apiRef = useGridApiContext() as RefObject<GridApiPremium>;
	const { t } = useTranslation();

	const [width, setWidth] = useState(() => {
		const dimensions = apiRef.current.getRootDimensions();
		return dimensions?.viewportInnerSize.width;
	});

	const handleViewportInnerSizeChange = useCallback(() => {
		const dimensions = apiRef.current.getRootDimensions();
		setWidth(dimensions?.viewportInnerSize.width);
	}, [apiRef]);

	useEffect(() => {
		return apiRef.current.subscribeEvent(
			"viewportInnerSizeChange",
			handleViewportInnerSizeChange,
		);
	}, [apiRef, handleViewportInnerSizeChange]);


	switch (type) {
		case "cluster":
			return (
				<MasterDetailLayout width={width}>
					<Grid container spacing={2} role="row">
						<Grid size={4} role="gridcell">
							<Attribute label={t("requesting.bib_record_id")}>
								<Typography variant="attributeText" component="div">
									<CustomLink
										to="/bibs/$id"
										params={{ id: row?.id }}
										underline="hover"
										onClick={(e) => {
											e.stopPropagation();
										}}>
										<RenderAttribute attribute={row?.id} />
									</CustomLink>
								</Typography>
							</Attribute>
						</Grid>
						<Grid size={4} role="gridcell">
							<Attribute label={t("bibs.author")}>
								<Typography variant="attributeText">
									<RenderAttribute attribute={row?.author} />
								</Typography>
							</Attribute>
						</Grid>
						<Grid size={8} role="gridcell">
							<Attribute label={t("requesting.identifiers")}>
								<List sx={{ pl: 0, ml: 0 }} dense disablePadding>
									{row.canonicalMetadata.identifiers.map(
										(id: { namespace: string; value: string }) => (
											<ListItem
												sx={{ pl: 0 }}
												key={`${id.namespace}-${id.value}`}
												disablePadding>
												<ListItemText
													primary={`${id.namespace}: ${id.value}`}
												/>
											</ListItem>
										),
									)}
								</List>
							</Attribute>
						</Grid>
						<Grid size={8} role="gridcell">
							<Accordion elevation={0}>
								<AccordionSummary
									expandIcon={<ExpandMore />}
									aria-controls="source-bibs-source-record-json-content"
									id="source-bibs-source-record-json-header">
									<Typography>{t("bibs.source_record")}</Typography>
								</AccordionSummary>
								<AccordionDetails id="source-bibs-source-record-json-content">
									<pre>{JSON.stringify(row?.sourceRecord, null, 2)}</pre>
								</AccordionDetails>
							</Accordion>
						</Grid>
						<Grid size={8} role="gridcell">
							<Accordion elevation={0}>
								<AccordionSummary
									expandIcon={<ExpandMore />}
									aria-controls="search-canonical-metadata-content"
									id="search-canonical-metadata-header">
									<Typography>{t("bibs.canonical_metadata")}</Typography>
								</AccordionSummary>
								<AccordionDetails id="search-canonical-metadata-content">
									<pre>{JSON.stringify(row?.canonicalMetadata, null, 2)}</pre>
								</AccordionDetails>
							</Accordion>
						</Grid>
					</Grid>
				</MasterDetailLayout>
			);
		case "dataChangeLog":
			return (
				<MasterDetailLayout width={width}>
					<ChangesSummary
						changes={row?.changes}
						action={row?.actionInfo}
						context="dataChangeLog"
					/>
				</MasterDetailLayout>
			);

		case "items":
			return (
				<MasterDetailLayout width={width}>
					<Grid size={4}>
						<Attribute label={t("requesting.context")}>
							<RenderAttribute attribute={row?.owningContext} />
						</Attribute>
					</Grid>
					<Grid size={4}>
						<Attribute label={t("agency.code")}>
							<RenderAttribute attribute={row?.agency?.code} />
						</Attribute>
					</Grid>
					<Grid size={4}>
						<Attribute label={t("agency.name")}>
							<RenderAttribute attribute={row?.agency?.description} />
						</Attribute>
					</Grid>
					<Grid size={4}>
						<Attribute label={t("location.name")}>
							<RenderAttribute attribute={row?.location?.name} />
						</Attribute>
					</Grid>
					<Grid size={4}>
						<Attribute label={t("location.code")}>
							<RenderAttribute attribute={row?.location?.code} />
						</Attribute>
					</Grid>
					<Grid size={4}>
						<Attribute label={t("requesting.barcode")}>
							<RenderAttribute attribute={row?.barcode} />
						</Attribute>
					</Grid>
					<Grid size={4}>
						<Attribute label={t("requesting.call_no")}>
							<RenderAttribute attribute={row?.callNumber} />
						</Attribute>
					</Grid>
					<Grid size={4}>
						<Attribute label={t("requesting.local_item_type_code")}>
							<RenderAttribute attribute={row?.localItemTypeCode} />
						</Attribute>
					</Grid>
					<Grid size={4}>
						<Attribute label={t("requesting.local_item_type_name")}>
							<RenderAttribute attribute={row?.localItemType} />
						</Attribute>
					</Grid>
					<Grid size={4}>
						<Attribute label={t("requesting.supplier_type")}>
							<RenderAttribute attribute={row?.canonicalItemType} />
						</Attribute>
					</Grid>
					<Grid size={4}>
						<Attribute label={t("requesting.source_system_code")}>
							<RenderAttribute attribute={row?.sourceHostLmsCode} />{" "}
							{/** This could include a link to the bib record, if we can establish source LMS */}
						</Attribute>
					</Grid>
					{row?.statusCorrectAsOf ? (
						<Grid size={{ xs: 2, sm: 4, md: 4 }}>
							<Attribute label={t("ui.info.correct_as_of")}>
								<RenderAttribute
									attribute={dayjs(row?.statusCorrectAsOf).format(
										"YYYY-MM-DD HH:mm",
									)}
								/>
							</Attribute>
						</Grid>
					) : null}
				</MasterDetailLayout>
			);

		default:
			return null;
	}
}
