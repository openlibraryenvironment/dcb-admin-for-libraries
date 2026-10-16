import { Attribute } from "@components/Attribute/Attribute";
import { pageTitle } from "@helpers/pageTitle";
import Error from "@components/Error/Error";
import Loading from "@components/Loading/Loading";
import RenderAttribute from "@components/RenderAttribute/RenderAttribute";
import { getILS } from "@helpers/getILS";
import { getLocalId } from "@helpers/getLocalId";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { locationQueryOptions } from "@helpers/sharedQueries";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "react-oidc-context";
import { isUuidShaped } from "@helpers/isUuidShaped";
import { DETAIL_COLUMNS, FULL_ROW, DETAIL_ITEM } from "@constants/detailGrid";

export const Route = createFileRoute("/__authenticated/locations/$id/")({
	head: () => ({ meta: [{ title: pageTitle("nav.locations.title") }] }),
	component: RouteComponent,
});
function RouteComponent() {
	const { t } = useTranslation();
	const auth = useAuth();

	const { id } = Route.useParams();

	const { cfg } = useRouter().options.context as { cfg: any };

	const {
		data: pickupLocationData,
		isLoading: pickupLocationLoading,
		isError: isLocationError,
	} = useQuery({
		...locationQueryOptions(cfg.VITE_DCB_API_BASE, id),
		enabled: !!auth.user && isUuidShaped(id),
	});
	const location = pickupLocationData?.locations?.content?.[0];

	if (pickupLocationLoading) {
		return (
			<Loading
				title={t("ui.info.loading.document", {
					document_type: t("entities.location").toLowerCase(),
				})}
				subtitle={t("ui.info.wait")}
			/>
		);
	}

	if (isLocationError || !location) {
		return (
			<Error
				title={
					isLocationError
						? t("ui.feedback.error.cannot_retrieve_record")
						: t("ui.feedback.error.cannot_find_record")
				}
				message={
					isLocationError
						? t("ui.info.connection_issue")
						: t("ui.feedback.error.invalid_UUID")
				}
				action={t("ui.actions.go_back")}
				goBack="/locations"
			/>
		);
	}
	const ils = getILS(location?.hostSystem?.lmsClientClass);

	return (
		<Grid
			container
			spacing={{ xs: 2, md: 3 }}
			columns={DETAIL_COLUMNS}>
			<Grid size={FULL_ROW}>
				<Typography variant="h1">{location.name || t("location.title")}</Typography>
			</Grid>
			<Grid size={DETAIL_ITEM}>
				<Attribute label={t("location.name")}>
					<RenderAttribute attribute={location?.name} />
				</Attribute>
			</Grid>
			<Grid size={DETAIL_ITEM}>
				<Attribute label={t("location.code")}>
					<RenderAttribute attribute={location?.code} />
				</Attribute>
			</Grid>
			<Grid size={DETAIL_ITEM}>
				<Attribute label={t("location.type")}>
					<RenderAttribute attribute={location?.type} />
				</Attribute>
			</Grid>
			<Grid size={DETAIL_ITEM}>
				<Attribute label={t("location.latitude")}>
					<RenderAttribute attribute={location?.latitude} />
				</Attribute>
			</Grid>
			<Grid size={DETAIL_ITEM}>
				<Attribute label={t("location.longitude")}>
					<RenderAttribute attribute={location?.longitude} />
				</Attribute>
			</Grid>
			<Grid size={DETAIL_ITEM}>
				<Stack direction={"column"}>
					<Attribute label={t("location.pickup_status")}>
						{location?.isPickup
							? t("ui.feedback.enabled")
							: location?.isPickup == false
								? t("ui.feedback.disabled")
								: t("ui.feedback.not_set")}
					</Attribute>
				</Stack>
			</Grid>
			<Grid size={DETAIL_ITEM}>
				<Attribute label={t("location.pickup_anywhere_status")}>
					{location?.isPickupAnywhere
						? t("ui.feedback.enabled")
						: location?.isPickupAnywhere == false
							? t("ui.feedback.disabled")
							: t("ui.feedback.not_set")}
				</Attribute>
			</Grid>
			<Grid size={DETAIL_ITEM}>
				<Attribute label={t(getLocalId(ils))}>
					<RenderAttribute attribute={location?.localId} />
				</Attribute>
			</Grid>
			<Grid size={DETAIL_ITEM}>
				<Attribute label={t("location.print_label")}>
					<RenderAttribute attribute={location?.printLabel} />
				</Attribute>
			</Grid>
			<Grid size={DETAIL_ITEM}>
				<Attribute label={t("location.location_id")}>
					<RenderAttribute attribute={location?.id} />
				</Attribute>
			</Grid>
		</Grid>
	);
}
