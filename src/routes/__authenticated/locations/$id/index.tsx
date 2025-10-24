import Error from "@components/Error/Error";
import Loading from "@components/Loading/Loading";
import RenderAttribute from "@components/RenderAttribute/RenderAttribute";
import { getILS } from "@helpers/getILS";
import { getLocalId } from "@helpers/getLocalId";
import { LocationsQueryData } from "@models/ReactQueryHelperTypes";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { getLocation } from "@queries/getLocation";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import request from "graphql-request";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "react-oidc-context";

export const Route = createFileRoute("/__authenticated/locations/$id/")({
	component: RouteComponent,
});
// Read only by default
function RouteComponent() {
	const { t } = useTranslation();
	const auth = useAuth();

	const { id } = Route.useParams();

	const { cfg } = useRouter().options.context as { cfg: any };
	const DCB_URL = cfg.VITE_DCB_API_BASE + "/graphql";
	const headers = useMemo(
		() => ({ Authorization: `Bearer ${auth.user?.access_token}` }),
		[auth.user?.access_token]
	);

	const {
		data: pickupLocationData,
		isLoading: pickupLocationLoading,
		isError: isLocationError,
	} = useQuery<LocationsQueryData>({
		queryKey: ["pickupLocation", id, headers, DCB_URL],
		queryFn: async () =>
			request(
				DCB_URL,
				getLocation,
				{
					query: "id:" + id,
					pagesize: 10,
					pageno: 0,
					orderBy: "name",
					order: "ASC",
				},
				headers
			),
		enabled: !!auth.user, // Only run when authenticated
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
				goBack={`/locations}`}
			/>
		);
	}
	const ils = getILS(location?.hostSystem?.lmsClientClass);

	return (
		<Grid
			container
			spacing={{ xs: 2, md: 3 }}
			columns={{ xs: 3, sm: 6, md: 9, lg: 12 }}>
			<Grid size={{ xs: 4, sm: 8, md: 12 }}>
				<Typography variant="h1">{location?.name}</Typography>
			</Grid>
			<Grid size={{ xs: 2, sm: 4, md: 4 }}>
				<Stack direction={"column"}>
					<Typography variant="attributeTitle">{t("location.name")}</Typography>
					<RenderAttribute attribute={location?.name} />
				</Stack>
			</Grid>
			<Grid size={{ xs: 2, sm: 4, md: 4 }}>
				<Stack direction={"column"}>
					<Typography variant="attributeTitle">{t("location.code")}</Typography>
					<RenderAttribute attribute={location?.code} />
				</Stack>
			</Grid>
			<Grid size={{ xs: 2, sm: 4, md: 4 }}>
				<Stack direction={"column"}>
					<Typography variant="attributeTitle">{t("location.type")}</Typography>
					<RenderAttribute attribute={location?.type} />
				</Stack>
			</Grid>
			<Grid size={{ xs: 2, sm: 4, md: 4 }}>
				<Stack direction={"column"}>
					<Typography variant="attributeTitle">
						{t("location.latitude")}
					</Typography>
					<RenderAttribute attribute={location?.latitude} />
				</Stack>
			</Grid>
			<Grid size={{ xs: 2, sm: 4, md: 4 }}>
				<Stack direction={"column"}>
					<Typography variant="attributeTitle">
						{t("location.longitude")}
					</Typography>
					<RenderAttribute attribute={location?.longitude} />
				</Stack>
			</Grid>
			<Grid size={{ xs: 2, sm: 4, md: 4 }}>
				<Stack direction={"column"}>
					<Stack direction={"column"}>
						<Typography variant="attributeTitle">
							{t("location.pickup_status")}
						</Typography>
						{location?.isPickup
							? t("ui.feedback.enabled")
							: location?.isPickup == false
								? t("ui.feedback.disabled")
								: t("ui.feedback.not_set")}
					</Stack>
				</Stack>
			</Grid>
			<Grid size={{ xs: 2, sm: 4, md: 4 }}>
				<Stack direction={"column"}>
					<Typography variant="attributeTitle">
						{t("location.pickup_anywhere_status")}
					</Typography>
					{location?.isPickupAnywhere
						? t("ui.feedback.enabled")
						: location?.isPickupAnywhere == false
							? t("ui.feedback.disabled")
							: t("ui.feedback.not_set")}
				</Stack>
			</Grid>
			<Grid size={{ xs: 2, sm: 4, md: 4 }}>
				<Stack direction={"column"}>
					<Typography variant="attributeTitle">{t(getLocalId(ils))}</Typography>
					<RenderAttribute attribute={location?.localId} />
				</Stack>
			</Grid>
			<Grid size={{ xs: 2, sm: 4, md: 4 }}>
				<Stack direction={"column"}>
					<Typography variant="attributeTitle">
						{t("location.print_label")}
					</Typography>
					<RenderAttribute attribute={location?.printLabel} />
				</Stack>
			</Grid>
			<Grid size={{ xs: 2, sm: 4, md: 4 }}>
				<Stack direction={"column"}>
					<Typography variant="attributeTitle">
						{t("location.location_id")}
					</Typography>
					<RenderAttribute attribute={location?.id} />
				</Stack>
			</Grid>
		</Grid>
	);
}
