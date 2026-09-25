import { useMemo, useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "react-oidc-context";
import { useTranslation } from "react-i18next";
import { request } from "graphql-request";
import {
	Alert,
	Button,
	Chip,
	FormControlLabel,
	Grid,
	Stack,
	Switch,
	TextField,
	Typography,
} from "@mui/material";

import { getLibrary } from "@queries/getLibrary";
import { getAnnouncements } from "@queries/getAnnouncements";
import {
	createAnnouncement,
	deleteAnnouncement,
} from "@mutations/announcements";
import { isAnnouncementsEnabled } from "@helpers/featureFlags";
import { useAgencyCodes } from "@/hooks/useAgencyCodes";
import type { Library } from "@models/Library";

/**
 * Telling this library's patrons something.
 *
 * The flag gates the DOCUMENT, not the render: an operation dcb-service does not declare
 * fails the whole operation, so the route explains itself rather than showing a form that
 * cannot work. What this is for, why the expiry is required, and the rest of the argument:
 * docs/announcements.md.
 */
export const Route = createFileRoute("/__authenticated/announcements")({
	component: AnnouncementsRoute,
});

/** A fortnight. Long enough for an outage, short enough to be noticed when it lapses. */
const DEFAULT_DAYS = 14;

function AnnouncementsRoute() {
	const { t } = useTranslation();

	if (!isAnnouncementsEnabled()) {
		return (
			<Alert severity="info" sx={{ m: 2 }}>
				{t("announcements.unavailable")}
			</Alert>
		);
	}

	return <Announcements />;
}

function Announcements() {
	const { t } = useTranslation();
	const auth = useAuth();
	const queryClient = useQueryClient();
	const { cfg } = useRouter().options.context as { cfg: { DCB_API_BASE: string } };
	const { agencyCode: code } = useAgencyCodes();

	const headers = useMemo(
		() => ({ Authorization: `Bearer ${auth.user?.access_token}` }),
		[auth.user?.access_token],
	);

	const libraryQuery = useQuery({
		queryKey: ["libraryInfo", headers, code, cfg.DCB_API_BASE],
		queryFn: async () =>
			request(
				cfg.DCB_API_BASE + "/graphql",
				getLibrary(),
				{
					query: "agencyCode:" + code,
					pagesize: 10,
					pageno: 0,
					orderBy: "fullName",
					order: "DESC",
				},
				headers,
			),
	});

	const library: Library | undefined = (
		libraryQuery.data as { libraries?: { content?: Library[] } } | undefined
	)?.libraries?.content?.[0];

	const scopeId = library?.id;

	// headers is in the key because the queryFn fetches with it: a token change is a
	// different request, and a key that omits an input serves the previous session an
	// answer it was not entitled to.
	const listKey = ["LoadAnnouncements", cfg.DCB_API_BASE, headers, scopeId];

	const announcements = useQuery({
		queryKey: listKey,
		// Only once the library is known: the scope is its id, and asking for announcements
		// at `undefined` scope is a request that can only fail.
		enabled: Boolean(scopeId),
		queryFn: async () =>
			request(
				cfg.DCB_API_BASE + "/graphql",
				getAnnouncements(),
				{ scopeType: "LIBRARY", scopeId },
				headers,
			),
	});

	const publish = useMutation({
		mutationFn: (input: Record<string, unknown>) =>
			request(cfg.DCB_API_BASE + "/graphql", createAnnouncement(), { input }, headers),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: listKey }),
	});

	const withdraw = useMutation({
		mutationFn: (id: string) =>
			request(
				cfg.DCB_API_BASE + "/graphql",
				deleteAnnouncement(),
				{ input: { id, reason: "Withdrawn from DCB Admin for Libraries" } },
				headers,
			),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: listKey }),
	});

	const [headline, setHeadline] = useState("");
	const [body, setBody] = useState("");
	const [dismissible, setDismissible] = useState(true);
	const [expiresAt, setExpiresAt] = useState(defaultExpiry());

	const rows =
		(announcements.data as { announcements?: AnnouncementRow[] } | undefined)
			?.announcements ?? [];

	const canPublish =
		headline.trim().length > 0 && body.trim().length > 0 && !publish.isPending;

	return (
		<Grid container spacing={3} columns={{ xs: 4, sm: 8, md: 12 }} sx={{ p: 2 }}>
			<Grid size={{ xs: 4, sm: 8, md: 12 }}>
				<Typography variant="h2" component="h1" gutterBottom>
					{t("announcements.title")}
				</Typography>
				<Typography color="text.secondary">
					{t("announcements.scope_help")}
				</Typography>
			</Grid>

			{publish.isError && (
				<Grid size={{ xs: 4, sm: 8, md: 12 }}>
					{/* dcb-service writes its refusals for a person — "expiresAt is required;
					    an announcement with no window is a notice nobody will take down".
					    Shown as-is: the whole argument for validating on the server is undone
					    if the administrator is told only that it failed. */}
					<Alert severity="error">{String(publish.error)}</Alert>
				</Grid>
			)}

			<Grid size={{ xs: 4, sm: 8, md: 6 }}>
				<Stack spacing={2} component="form">
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
						slotProps={{ inputLabel: { shrink: true } }}
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
					<Button
						variant="contained"
						disabled={!canPublish}
						onClick={() =>
							publish.mutate({
								scopeType: "LIBRARY",
								scopeId,
								headline: headline.trim(),
								body: body.trim(),
								// A library never publishes at consortium scope, so there is no
								// urgency control here: urgency exists to rank a consortium notice
								// against a library's own, and this IS the library's own.
								dismissible,
								startsAt: new Date().toISOString(),
								expiresAt: endOfDay(expiresAt),
							})
						}
					>
						{t("announcements.publish")}
					</Button>
				</Stack>
			</Grid>

			<Grid size={{ xs: 4, sm: 8, md: 6 }}>
				<Typography variant="h3" component="h2" gutterBottom>
					{t("announcements.current")}
				</Typography>

				{rows.length === 0 ? (
					<Typography color="text.secondary">
						{t("announcements.none")}
					</Typography>
				) : (
					<Stack spacing={2}>
						{rows.map((row) => (
							<Stack key={row.id} spacing={0.5}>
								<Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
									<Typography variant="subtitle1">{row.headline}</Typography>
									{/* An expired notice is still listed, because "why has that
									    gone" is the next question an administrator asks. */}
									{isExpired(row) && (
										<Chip size="small" label={t("announcements.expired")} />
									)}
								</Stack>
								<Typography variant="body2">{row.body}</Typography>
								<Typography variant="caption" color="text.secondary">
									{t("announcements.until", { date: row.expiresAt })}
								</Typography>
								<Button
									size="small"
									onClick={() => withdraw.mutate(row.id)}
									disabled={withdraw.isPending}
									sx={{ alignSelf: "flex-start", minHeight: 24 }}
								>
									{t("announcements.withdraw")}
								</Button>
							</Stack>
						))}
					</Stack>
				)}
			</Grid>
		</Grid>
	);
}

interface AnnouncementRow {
	id: string;
	headline: string;
	body: string;
	urgent: boolean;
	dismissible: boolean;
	startsAt: string;
	expiresAt: string;
}

const isExpired = (row: AnnouncementRow) => new Date(row.expiresAt) <= new Date();

/** `yyyy-mm-dd`, which is what a native date input reads and writes. */
function defaultExpiry(): string {
	const when = new Date();
	when.setDate(when.getDate() + DEFAULT_DAYS);
	return when.toISOString().slice(0, 10);
}

/**
 * The end of the chosen day rather than its midnight.
 *
 * A date input yields a date; an administrator choosing the 30th means "up to and including
 * the 30th", and sending midnight would take the notice down a day early — on the day they
 * thought it would still be up.
 */
function endOfDay(date: string): string {
	return new Date(`${date}T23:59:59.000Z`).toISOString();
}
