import { useClock } from "@/hooks/useThemeStore";
import { formatTimestamp } from "@helpers/formatters";
import { Attribute } from "@components/Attribute/Attribute";
import { pageTitle } from "@helpers/pageTitle";
import { useQuery } from "@tanstack/react-query";
import {
	createFileRoute,
	useNavigate,
	useRouter,
} from "@tanstack/react-router";
import {
	Box,
	Button,
	CircularProgress,
	Grid,
	Stack,
	Tooltip,
	Typography,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import request from "graphql-request";
import { useAuth } from "react-oidc-context";
import { ArrowLeft, ArrowRight } from "@mui/icons-material";
import { isUuidShaped } from "@helpers/isUuidShaped";
import { DETAIL_COLUMNS, FULL_ROW, WRAPPED_PRE } from "@constants/detailGrid";

import RenderAttribute from "@/components/RenderAttribute/RenderAttribute";
import Loading from "@/components/Loading/Loading";
import Error from "@/components/Error/Error";
import { AuditItem } from "@/models/AuditItem";
import { AuditQueryData } from "@models/ReactQueryHelperTypes";
import { getAuditById } from "@queries/getAuditById";
import { getAuditNeighbours } from "@queries/getAuditNeighbours";
import { queryKeys } from "@helpers/queryKeys";
import { authHeaders } from "@helpers/auth";
import { dcbStatusLabel } from "@constants/statuses/DCBStatuses";

type AuditNeighbour = Pick<AuditItem, "id" | "briefDescription">;

interface AuditNeighboursQueryData {
	older: { content: AuditNeighbour[] };
	newer: { content: AuditNeighbour[] };
}

// The characters an ISO-8601 instant can contain, so the date cannot end the range term early.
const INSTANT_SHAPE = /^[0-9T:.+\-Z]+$/;

export const Route = createFileRoute(
	"/__authenticated/patronRequests/audits/$auditId/"
)({
	head: () => ({ meta: [{ title: pageTitle("audit.title") }] }),
	component: AuditDetailsComponent,
});

function AuditDetailsComponent() {
	const { t } = useTranslation();
	const clock = useClock();
	const navigate = useNavigate();
	const auth = useAuth();

	const { auditId } = Route.useParams();
	const isValidId = isUuidShaped(auditId);

	const { cfg } = useRouter().options.context as { cfg: any };
	const apiBase = cfg.VITE_DCB_API_BASE;

	const {
		data: auditData,
		isLoading: isAuditLoading,
		isError: isAuditError,
	} = useQuery<AuditQueryData>({
		queryKey: queryKeys.audits.detail(apiBase, auditId),
		queryFn: async () =>
			request(
				apiBase + "/graphql",
				getAuditById,
				{
					query: "id:" + auditId,
					pagesize: 10,
					pageno: 0,
				},
				await authHeaders()
			),
		enabled: !!auth.user && isValidId,
	});
	const audit = auditData?.audits?.content?.[0];

	const patronRequestId =
		audit?.patronRequest?.id ?? audit?.auditData?.patronRequestId;
	const auditDate = audit?.auditDate;
	const canFindNeighbours =
		!!patronRequestId &&
		isUuidShaped(patronRequestId) &&
		!!auditDate &&
		INSTANT_SHAPE.test(auditDate);

	const {
		data: neighbours,
		isLoading: areNeighboursLoading,
		isError: areNeighboursError,
	} = useQuery<AuditNeighboursQueryData>({
		queryKey: queryKeys.audits.neighbours(
			apiBase,
			patronRequestId ?? "",
			auditDate ?? "",
		),
		// The bound is the service's own string, never a parsed Date: the column keeps
		// microseconds and a Date keeps milliseconds, so a round-tripped bound would
		// return this entry as its own neighbour.
		queryFn: async () =>
			request(
				apiBase + "/graphql",
				getAuditNeighbours,
				{
					older: `patronRequest:${patronRequestId} AND auditDate:{* TO ${auditDate}}`,
					newer: `patronRequest:${patronRequestId} AND auditDate:{${auditDate} TO *}`,
				},
				await authHeaders()
			),
		enabled: canFindNeighbours,
	});

	const previousAudit = neighbours?.older?.content?.[0] ?? null;
	const nextAudit = neighbours?.newer?.content?.[0] ?? null;

	const handleReturn = () => {
		if (patronRequestId) {
			navigate({
				to: "/patronRequests/$id",
				params: { id: patronRequestId },
				search: { tab: 5 },
				hash: "auditlog",
			});
		}
	};
	const handleNavigate = (targetAuditId: string | null) => {
		if (targetAuditId) {
			navigate({
				to: "/patronRequests/audits/$auditId",
				params: { auditId: targetAuditId },
			});
		}
	};

	// Render loading and error states
	if (isAuditLoading) {
		return (
			<Loading
				title={t("ui.info.loading.document", {
					document_type: t("audit.audit_entry").toLowerCase(),
				})}
				subtitle={t("ui.info.wait")}
			/>
		);
	}

	if (isAuditError || !audit) {
		return (
			<Error
				title={
					isAuditError
						? t("ui.feedback.error.cannot_retrieve_record")
						: t("ui.feedback.error.cannot_find_record")
				}
				message={
					isAuditError
						? t("ui.info.connection_issue")
						: t("ui.feedback.error.invalid_UUID")
				}
				action={t("ui.actions.go_back")}
				goBack={patronRequestId ? `/patronRequests/${patronRequestId}` : `/`}
			/>
		);
	}

	return (
        <Grid
			container
			spacing={{ xs: 2, md: 3 }}
			columns={DETAIL_COLUMNS}>
            <Grid size={FULL_ROW}>
				<Typography variant="h1">{audit.briefDescription || t("audit.audit_entry")}</Typography>
			</Grid>
            <Grid size={{ xs: 2, sm: 4, md: 4 }}>
				<Attribute label={t("audit.uuid")}>
					<RenderAttribute attribute={audit?.id} />
				</Attribute>
			</Grid>
            <Grid size={{ xs: 2, sm: 4, md: 4 }}>
				<Attribute label={t("audit.date")}>
					<RenderAttribute
						attribute={formatTimestamp(audit?.auditDate, clock, {
							precise: true,
						})}
					/>
				</Attribute>
			</Grid>
            <Grid size={{ xs: 2, sm: 4, md: 4 }}>
				<Attribute label={t("audit.description")}>
					<RenderAttribute attribute={audit?.briefDescription} />
				</Attribute>
			</Grid>
            <Grid size={{ xs: 2, sm: 4, md: 4 }}>
				<Attribute label={t("audit.from_status")}>
					<RenderAttribute attribute={dcbStatusLabel(audit?.fromStatus, t)} />
				</Attribute>
			</Grid>
            <Grid size={{ xs: 2, sm: 4, md: 4 }}>
				<Attribute label={t("audit.to_status")}>
					<RenderAttribute attribute={dcbStatusLabel(audit?.toStatus, t)} />
				</Attribute>
			</Grid>
            <Grid size={{ xs: 2, sm: 4, md: 4 }}>
				<Attribute label={t("patron_request.patron_request_uuid")}>
					<RenderAttribute attribute={audit?.patronRequest?.id} />
				</Attribute>
			</Grid>
            <Grid size={FULL_ROW}>
				<Attribute label={t("audit.data")}>
					<Box component="pre" sx={WRAPPED_PRE}>
						{JSON.stringify(audit?.auditData, null, 2)}
					</Box>
				</Attribute>
			</Grid>
            <Grid size={FULL_ROW}>
				<Stack
                    direction="row"
                    sx={{
                        justifyContent: "space-between",
                        width: "100%"
                    }}>
					<Button variant="contained" onClick={handleReturn}>
						{t("patron_request.return")}
					</Button>
					<Stack direction="row" spacing={2}>
						<Tooltip
							describeChild
							title={
								previousAudit
									? previousAudit.briefDescription
									: t("ui.info.oldest_entry")
							}>
							<span>
								<Button
									variant="outlined"
									onClick={() => handleNavigate(previousAudit?.id ?? null)}
									disabled={
										!previousAudit ||
										areNeighboursLoading ||
										areNeighboursError
									}
									startIcon={
										areNeighboursLoading ? (
											<CircularProgress size={20} aria-label={t("ui.info.loading.value")} />
										) : (
											<ArrowLeft />
										)
									}>
									{t("ui.actions.older")}
								</Button>
							</span>
						</Tooltip>
						<Tooltip
							describeChild
							title={
								nextAudit
									? nextAudit.briefDescription
									: t("ui.info.newest_entry")
							}>
							<span>
								<Button
									variant="outlined"
									onClick={() => handleNavigate(nextAudit?.id ?? null)}
									disabled={
										!nextAudit || areNeighboursLoading || areNeighboursError
									}
									endIcon={
										areNeighboursLoading ? (
											<CircularProgress size={20} aria-label={t("ui.info.loading.value")} />
										) : (
											<ArrowRight />
										)
									}>
									{t("ui.actions.newer")}
								</Button>
							</span>
						</Tooltip>
					</Stack>
				</Stack>
			</Grid>
        </Grid>
    );
}
