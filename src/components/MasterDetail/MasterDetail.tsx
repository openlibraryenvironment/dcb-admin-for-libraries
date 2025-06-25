import {
	Accordion,
	AccordionDetails,
	AccordionSummary,
	Link,
	List,
	ListItem,
	ListItemText,
	Stack,
	Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import { GridApiPro, useGridApiContext } from "@mui/x-data-grid-premium";
import { useTranslation } from "react-i18next";
import { RefObject, useCallback, useEffect, useState } from "react";
import RenderAttribute from "../RenderAttribute/RenderAttribute";
import MasterDetailLayout from "./MasterDetailLayout";
// import dayjs from "dayjs";
// import { formatDuration } from "src/helpers/formatDuration";
// import ChangesSummary from "@components/ChangesSummary/ChangesSummary";
import ExpandMore from "@mui/icons-material/ExpandMore";
import ChangesSummary from "../ChangesSummary/ChangesSummary";

interface MasterDetailType {
	row: any;
	type: string;
}

export default function MasterDetail({ row, type }: MasterDetailType) {
	const apiRef = useGridApiContext() as RefObject<GridApiPro>;
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
			handleViewportInnerSizeChange
		);
	}, [apiRef, handleViewportInnerSizeChange]);

	// const { t } = useTranslation();

	switch (type) {
		case "cluster":
			return (
				<MasterDetailLayout width={width}>
					<Grid container spacing={2} role="row">
						<Grid size={4} role="gridcell">
							<Stack direction="column">
								<Typography variant="attributeTitle">
									{t("search.bib_record_id")}
								</Typography>
								<Typography variant="attributeText" component="div">
									<Link
										href={`/bibs/${row?.id}`}
										underline="hover"
										onClick={(e) => {
											e.stopPropagation();
										}}>
										<RenderAttribute attribute={row?.id} />
									</Link>
								</Typography>
							</Stack>
						</Grid>
						<Grid size={4} role="gridcell">
							<Stack direction="column">
								<Typography variant="attributeTitle">
									{t("details.author")}
								</Typography>
								<Typography variant="attributeText">
									<RenderAttribute attribute={row?.author} />
								</Typography>
							</Stack>
						</Grid>
						<Grid size={8} role="gridcell">
							<Stack direction="column">
								<Typography variant="attributeTitle">
									{t("search.identifiers")}
								</Typography>
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
										)
									)}
								</List>
							</Stack>
						</Grid>
						<Grid size={8} role="gridcell">
							<Accordion elevation={0}>
								<AccordionSummary
									expandIcon={<ExpandMore />}
									aria-controls="source-bibs-source-record-json-content"
									id="source-bibs-source-record-json-header">
									<Typography>{t("details.source_record")}</Typography>
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
									<Typography>{t("details.canonical_metadata")}</Typography>
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
						<Stack direction={"column"}>
							<Typography variant="attributeTitle">
								{t("search.context")}
							</Typography>
							<RenderAttribute attribute={row?.owningContext} />
						</Stack>
					</Grid>
					<Grid size={4}>
						<Stack direction={"column"}>
							<Typography variant="attributeTitle">
								{t("details.agency_code")}
							</Typography>
							<RenderAttribute attribute={row?.agency?.code} />
						</Stack>
					</Grid>
					<Grid size={4}>
						<Stack direction={"column"}>
							<Typography variant="attributeTitle">
								{t("details.agency_name")}
							</Typography>
							<RenderAttribute attribute={row?.agency?.description} />
						</Stack>
					</Grid>
					<Grid size={4}>
						<Stack direction={"column"}>
							<Typography variant="attributeTitle">
								{t("details.location_name")}
							</Typography>
							<RenderAttribute attribute={row?.location?.name} />
						</Stack>
					</Grid>
					<Grid size={4}>
						<Stack direction={"column"}>
							<Typography variant="attributeTitle">
								{t("details.location_code")}
							</Typography>
							<RenderAttribute attribute={row?.location?.code} />
						</Stack>
					</Grid>
					<Grid size={4}>
						<Stack direction={"column"}>
							<Typography variant="attributeTitle">
								{t("search.barcode")}
							</Typography>
							<RenderAttribute attribute={row?.barcode} />
						</Stack>
					</Grid>
					<Grid size={4}>
						<Stack direction={"column"}>
							<Typography variant="attributeTitle">
								{t("search.call_no")}
							</Typography>
							<RenderAttribute attribute={row?.callNumber} />
						</Stack>
					</Grid>
					<Grid size={4}>
						<Stack direction={"column"}>
							<Typography variant="attributeTitle">
								{t("search.local_item_type_code")}
							</Typography>
							<RenderAttribute attribute={row?.localItemTypeCode} />
						</Stack>
					</Grid>
					<Grid size={4}>
						<Stack direction={"column"}>
							<Typography variant="attributeTitle">
								{t("search.local_item_type_name")}
							</Typography>
							<RenderAttribute attribute={row?.localItemType} />
						</Stack>
					</Grid>
				</MasterDetailLayout>
			);

		default:
			return null;
	}
}
