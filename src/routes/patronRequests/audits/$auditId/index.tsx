import { useQuery } from "@tanstack/react-query";
import {
	createFileRoute,
	useNavigate,
	useRouter,
} from "@tanstack/react-router";
import {
	Button,
	CircularProgress,
	Grid,
	Stack,
	Tooltip,
	Typography,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import request from "graphql-request";
import dayjs from "dayjs";
import { useAuth } from "react-oidc-context";
import { useMemo } from "react";
// import { isEmpty } from "lodash";
import { ArrowLeft, ArrowRight } from "@mui/icons-material";

// Local Imports
import RenderAttribute from "@/components/RenderAttribute/RenderAttribute";
import Loading from "@/components/Loading/Loading";
import Error from "@/components/Error/Error";
import { AuditItem } from "@/models/AuditItem"; // Assuming models path
import { AuditQueryData } from "@models/ReactQueryHelperTypes";
import { getAuditById } from "@queries/getAuditById";
import { getAuditsByPatronRequest } from "@queries/getAuditByPatronRequest";

// Define the route and its component
export const Route = createFileRoute("/patronRequests/audits/$auditId/")({
	component: AuditDetailsComponent,
});

function AuditDetailsComponent() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const auth = useAuth();

	// 1. Get URL parameters using the type-safe useParams hook from the route
	const { auditId } = Route.useParams();

	// Get config and auth token for API calls
	const { cfg } = useRouter().options.context as { cfg: any };
	const DCB_URL = cfg.VITE_DCB_API_BASE + "/graphql";
	const headers = useMemo(
		() => ({ Authorization: `Bearer ${auth.user?.access_token}` }),
		[auth.user?.access_token]
	);

	// 2. First Query: Fetch the specific audit record by its ID
	const {
		data: auditData,
		isLoading: isAuditLoading,
		isError: isAuditError,
	} = useQuery<AuditQueryData>({
		queryKey: ["audit", auditId, headers, DCB_URL],
		queryFn: async () =>
			request(
				DCB_URL,
				getAuditById,
				{
					query: "id:" + auditId,
					pagesize: 10,
					pageno: 0,
					orderBy: "auditDate",
					order: "ASC",
				},
				headers
			),
		enabled: !!auth.user, // Only run when authenticated
	});
	const audit = auditData?.audits?.content?.[0];

	// Extract the patronRequestId to use in the next query
	const patronRequestId =
		audit?.patronRequest.id ?? audit?.auditData.patronRequestId;

	// 3. Second Query: Fetch ALL related audits for the same patron request
	// src/routes/patronRequests/$id/audits/$auditId.tsx

	// 3. Second Query: Fetch ALL related audits for the same patron request
	const {
		data: otherAudits = [],
		isLoading: areOtherAuditsLoading,
		isError: areOtherAuditsError,
	} = useQuery({
		// Removed the explicit generic here to let it be inferred from the typed queryFn
		queryKey: ["allAuditsForPatronRequest", patronRequestId, headers],
		// This queryFn handles all pagination internally and now explicitly returns Promise<AuditItem[]>
		queryFn: async (): Promise<AuditItem[]> => {
			if (!patronRequestId) return []; // Guard against running without the required ID

			const allContent: AuditItem[] = [];
			const pageSize = 100;
			let currentPage = 0;
			let totalPages = 1;

			// Fetch pages sequentially to gather all audit items
			do {
				const data = await request<{
					audits: { content: AuditItem[]; totalSize: number };
				}>(
					DCB_URL,
					getAuditsByPatronRequest,
					{
						query: "patronRequest:" + patronRequestId,
						order: "auditDate",
						orderBy: "ASC",
						pagesize: pageSize,
						pageno: currentPage,
					},
					headers
				);

				const content = data?.audits?.content ?? [];
				if (content.length > 0) {
					allContent.push(...content);
				}

				// Update total pages based on the first response
				if (currentPage === 0) {
					totalPages = Math.ceil((data?.audits?.totalSize ?? 0) / pageSize);
				}

				currentPage++;
			} while (currentPage < totalPages);

			// Sort the combined results by date one final time
			return allContent.sort(
				(a, b) =>
					new Date(a.auditDate).getTime() - new Date(b.auditDate).getTime()
			);
		},
		enabled: !!patronRequestId, // Only run when we have the patronRequestId
	});

	// 4. Derive previous/next navigation from the fully loaded audit list
	const currentAuditIndex = useMemo(
		() => otherAudits.findIndex((item) => item.id === auditId),
		[otherAudits, auditId]
	);

	const previousAudit =
		currentAuditIndex > 0 ? otherAudits[currentAuditIndex - 1] : null;
	const nextAudit =
		currentAuditIndex < otherAudits.length - 1
			? otherAudits[currentAuditIndex + 1]
			: null;

	// Helper functions for navigation
	const handleReturn = () => {
		if (patronRequestId) {
			navigate({ to: `/patronRequests/${patronRequestId}`, hash: `auditlog` });
		}
	};
	const handleNavigate = (targetAuditId: string | null) => {
		if (targetAuditId && patronRequestId) {
			navigate({
				to: `/patronRequests/audits/${targetAuditId}`,
			});
		}
	};

	// 5. Render loading and error states
	if (isAuditLoading || (areOtherAuditsLoading && patronRequestId)) {
		return (
			<Loading
				title={t("ui.info.loading.document", {
					document_type: t("audit.").toLowerCase(),
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
						? t("ui.error.cannot_retrieve_record")
						: t("ui.error.cannot_find_record")
				}
				message={
					isAuditError
						? t("ui.info.connection_issue")
						: t("ui.error.invalid_UUID")
				}
				action={t("ui.actions.go_back")}
				goBack={patronRequestId ? `/patronRequests/${patronRequestId}` : `/`}
			/>
		);
	}

	// 6. Render the main component JSX (mostly the same as your Next.js version)
	return (
		<Grid
			container
			spacing={{ xs: 2, md: 3 }}
			columns={{ xs: 2, sm: 2, md: 2 }}>
			{/* Audit Details Grid Items... (copied from original, no changes needed) */}
			<Grid size={{ xs: 2, sm: 4, md: 4 }}>
				<Stack>
					<Typography variant="attributeTitle">{t("audit.uuid")}</Typography>
					<RenderAttribute attribute={audit?.id} />
				</Stack>
			</Grid>
			<Grid size={{ xs: 2, sm: 4, md: 4 }}>
				<Stack>
					<Typography variant="attributeTitle">{t("audit.date")}</Typography>
					<RenderAttribute
						attribute={dayjs(audit?.auditDate).format(
							"YYYY-MM-DD HH:mm:ss.SSS"
						)}
					/>
				</Stack>
			</Grid>
			<Grid size={{ xs: 2, sm: 4, md: 4 }}>
				<Stack>
					<Typography variant="attributeTitle">
						{t("audit.description")}
					</Typography>
					<RenderAttribute attribute={audit?.briefDescription} />
				</Stack>
			</Grid>
			<Grid size={{ xs: 2, sm: 4, md: 4 }}>
				<Stack>
					<Typography variant="attributeTitle">
						{t("audit.from_status")}
					</Typography>
					<RenderAttribute attribute={audit?.fromStatus} />
				</Stack>
			</Grid>
			<Grid size={{ xs: 2, sm: 4, md: 4 }}>
				<Stack>
					<Typography variant="attributeTitle">
						{t("audit.to_status")}
					</Typography>
					<RenderAttribute attribute={audit?.toStatus} />
				</Stack>
			</Grid>
			<Grid size={{ xs: 2, sm: 4, md: 4 }}>
				<Stack>
					<Typography variant="attributeTitle">
						{t("patron_request.patron_request_uuid")}
					</Typography>
					<RenderAttribute attribute={audit?.patronRequest?.id} />
				</Stack>
			</Grid>
			<Grid size={{ xs: 2, sm: 4, md: 4 }}>
				<Typography variant="attributeTitle">{t("audit.data")}</Typography>
				<pre>{JSON.stringify(audit?.auditData, null, 2)}</pre>
			</Grid>

			{/* Navigation Buttons */}
			<Grid size={{ xs: 2, sm: 4, md: 4 }}>
				<Stack direction="row" justifyContent="space-between" width="100%">
					<Button variant="contained" onClick={handleReturn}>
						{t("patron_request.return")}
					</Button>
					<Stack direction="row" spacing={2}>
						<Tooltip
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
										areOtherAuditsLoading ||
										areOtherAuditsError
									}
									startIcon={
										areOtherAuditsLoading ? (
											<CircularProgress size={20} />
										) : (
											<ArrowLeft />
										)
									}>
									{t("ui.actions.older")}
								</Button>
							</span>
						</Tooltip>
						<Tooltip
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
										!nextAudit || areOtherAuditsLoading || areOtherAuditsError
									}
									endIcon={
										areOtherAuditsLoading ? (
											<CircularProgress size={20} />
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
