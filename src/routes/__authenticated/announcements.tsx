import { useState, type FormEvent } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ClientError, request } from "graphql-request";
import {
	Alert,
	Button,
	Chip,
	CircularProgress,
	FormControlLabel,
	Grid,
	Stack,
	Switch,
	TextField,
	Typography,
} from "@mui/material";

import {
	announcementsQueryOptions,
	isExpired,
	type AnnouncementRow,
} from "@helpers/announcements";
import Confirmation from "@components/Confirmation/Confirmation";
import {
	createAnnouncement,
	deleteAnnouncement,
} from "@mutations/announcements";
import { isAnnouncementsEnabled } from "@helpers/featureFlags";
import { pageTitle } from "@helpers/pageTitle";
import { ownLibraryQueryOptions } from "@helpers/ownLibrary";
import { authHeaders } from "@helpers/auth";
import { queryKeys } from "@helpers/queryKeys";
import { formatTimestamp } from "@helpers/formatters";
import {
	defaultExpiry,
	endOfDay,
	toDateInputValue,
} from "@helpers/announcementDates";
import { useAgencyCodes } from "@/hooks/useAgencyCodes";
import { useAnnounce } from "@/hooks/useAnnouncer";
import { useClock } from "@/hooks/useThemeStore";

/**
 * Telling this library's patrons something.
 *
 * The flag gates the DOCUMENT, not the render: an operation dcb-service does not declare
 * fails the whole operation, so the route explains itself rather than showing a form that
 * cannot work. What this is for, why the expiry is required, and the rest of the argument:
 * docs/announcements.md.
 */
export const Route = createFileRoute("/__authenticated/announcements")({
	head: () => ({ meta: [{ title: pageTitle("announcements.title") }] }),
	component: AnnouncementsRoute,
});

const FULL_WIDTH = { xs: 4, sm: 8, md: 12 } as const;

function AnnouncementsRoute() {
	const { t } = useTranslation();
	const { agencyCode } = useAgencyCodes();

	if (!isAnnouncementsEnabled()) {
		return (
			<Stack spacing={2} sx={{ p: 2 }}>
				<Typography variant="h2" component="h1">
					{t("announcements.title")}
				</Typography>
				<Alert severity="info">{t("announcements.unavailable")}</Alert>
			</Stack>
		);
	}

	// Per library, as the profile is: a draft must not be published to the next one chosen
	return <Announcements key={agencyCode ?? ""} />;
}

/**
 * dcb-service writes its refusals for a person, so the first GraphQL error is shown as-is.
 * String(error) would be graphql-request's message, which embeds the whole request.
 */
const serverMessage = (error: unknown, fallback: string): string =>
	(error instanceof ClientError && error.response.errors?.[0]?.message) ||
	fallback;

function Announcements() {
	const { t } = useTranslation();
	const announce = useAnnounce();
	const clock = useClock();
	const queryClient = useQueryClient();
	const { cfg } = useRouter().options.context as {
		cfg: { VITE_DCB_API_BASE: string };
	};
	const apiBase = cfg.VITE_DCB_API_BASE;
	const { agencyCode: code } = useAgencyCodes();

	const libraryQuery = useQuery({
		...ownLibraryQueryOptions(cfg, code ?? ""),
		enabled: Boolean(code),
	});

	const scopeId = libraryQuery.data?.libraries?.content?.[0]?.id ?? "";
	const listKey = queryKeys.announcements.forScope(apiBase, scopeId);

	const announcements = useQuery(announcementsQueryOptions(apiBase, scopeId));

	const [headline, setHeadline] = useState("");
	const [body, setBody] = useState("");
	const [dismissible, setDismissible] = useState(true);
	const [expiresAt, setExpiresAt] = useState(defaultExpiry);

	const publish = useMutation({
		mutationFn: async (input: Record<string, unknown>) =>
			request(
				apiBase + "/graphql",
				createAnnouncement(),
				{ input },
				await authHeaders(),
			),
		onSuccess: () => {
			setHeadline("");
			setBody("");
			setDismissible(true);
			setExpiresAt(defaultExpiry());
			announce(t("announcements.published"));
			return queryClient.invalidateQueries({ queryKey: listKey });
		},
	});

	const [withdrawing, setWithdrawing] = useState<AnnouncementRow | null>(null);
	const withdraw = useMutation({
		mutationFn: async (id: string) =>
			request(
				apiBase + "/graphql",
				deleteAnnouncement(),
				{ input: { id, reason: "Withdrawn from DCB Admin for Libraries" } },
				await authHeaders(),
			),
		onSuccess: () => {
			announce(t("announcements.withdrawn"));
			return queryClient.invalidateQueries({ queryKey: listKey });
		},
	});

	const rows = announcements.data?.announcements ?? [];

	const canPublish =
		Boolean(scopeId) &&
		headline.trim().length > 0 &&
		body.trim().length > 0 &&
		expiresAt.length > 0 &&
		!publish.isPending;

	const handlePublish = (event: FormEvent) => {
		event.preventDefault();
		if (!canPublish) return;
		publish.mutate({
			scopeType: "LIBRARY",
			scopeId,
			headline: headline.trim(),
			body: body.trim(),
			// A library never publishes at consortium scope, so there is no urgency control
			// here: urgency ranks a consortium notice against a library's own.
			dismissible,
			startsAt: new Date().toISOString(),
			expiresAt: endOfDay(expiresAt),
		});
	};

	const loadError = libraryQuery.error ?? announcements.error;
	const loading = libraryQuery.isLoading || announcements.isLoading;

	return (
		<Grid container spacing={3} columns={FULL_WIDTH} sx={{ p: 2 }}>
			<Grid size={FULL_WIDTH}>
				<Typography variant="h2" component="h1" gutterBottom>
					{t("announcements.title")}
				</Typography>
				<Typography color="text.secondary">
					{t("announcements.scope_help")}
				</Typography>
			</Grid>

			{publish.isError && (
				<Grid size={FULL_WIDTH}>
					<Alert severity="error">
						{serverMessage(publish.error, t("announcements.publish_failed"))}
					</Alert>
				</Grid>
			)}

			<Grid size={{ xs: 4, sm: 8, md: 6 }}>
				<Stack spacing={2} component="form" onSubmit={handlePublish}>
					<TextField
						label={t("announcements.headline")}
						value={headline}
						onChange={(event) => setHeadline(event.target.value)}
						slotProps={{ htmlInput: { maxLength: 200 } }}
						required
					/>
					<TextField
						label={t("announcements.body")}
						helperText={t("announcements.body_help")}
						value={body}
						onChange={(event) => setBody(event.target.value)}
						slotProps={{ htmlInput: { maxLength: 1000 } }}
						multiline
						minRows={3}
						required
					/>
					<TextField
						type="date"
						label={t("announcements.expires")}
						helperText={t("announcements.expires_help")}
						value={expiresAt}
						onChange={(event) => setExpiresAt(event.target.value)}
						slotProps={{
							inputLabel: { shrink: true },
							htmlInput: { min: toDateInputValue(new Date()) },
						}}
						required
					/>
					<FormControlLabel
						control={
							<Switch
								checked={dismissible}
								onChange={(event) => setDismissible(event.target.checked)}
							/>
						}
						label={t("announcements.dismissible")}
					/>
					<Button type="submit" variant="contained" disabled={!canPublish}>
						{t("announcements.publish")}
					</Button>
				</Stack>
			</Grid>

			<Grid size={{ xs: 4, sm: 8, md: 6 }}>
				<Typography variant="h3" component="h2" gutterBottom>
					{t("announcements.current")}
				</Typography>

				{withdraw.isError && (
					<Alert severity="error" sx={{ mb: 2 }}>
						{serverMessage(withdraw.error, t("announcements.withdraw_failed"))}
					</Alert>
				)}

				{loading ? (
					<CircularProgress aria-label={t("announcements.loading")} />
				) : loadError ? (
					<Alert severity="error">
						{serverMessage(loadError, t("announcements.load_failed"))}
					</Alert>
				) : rows.length === 0 ? (
					<Typography color="text.secondary">
						{t("announcements.none")}
					</Typography>
				) : (
					<Stack spacing={2}>
						{rows.map((row) => (
							<Stack key={row.id} spacing={0.5}>
								<Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
									<Typography variant="subtitle1" component="h3">
										{row.headline}
									</Typography>
									{/* An expired notice is still listed, because "why has that
									    gone" is the next question an administrator asks. */}
									{isExpired(row) && (
										<Chip size="small" label={t("announcements.expired")} />
									)}
								</Stack>
								<Typography variant="body2">{row.body}</Typography>
								<Typography variant="caption" color="text.secondary">
									{t("announcements.until", {
										date: formatTimestamp(row.expiresAt, clock),
									})}
								</Typography>
								<Button
									size="small"
									onClick={() => setWithdrawing(row)}
									disabled={withdraw.isPending}
									aria-label={t("announcements.withdraw_named", {
										headline: row.headline,
									})}
									sx={{ alignSelf: "flex-start", minHeight: 24 }}
								>
									{t("announcements.withdraw")}
								</Button>
							</Stack>
						))}
					</Stack>
				)}
				<Confirmation
					open={withdrawing !== null}
					onClose={() => setWithdrawing(null)}
					onConfirm={() => {
						if (withdrawing) withdraw.mutate(withdrawing.id);
						setWithdrawing(null);
					}}
					action="withdraw"
					entityName={withdrawing?.headline ?? ""}
					gridEdit={false}
				/>
			</Grid>
		</Grid>
	);
}

