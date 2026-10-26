import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import request from "graphql-request";
import {
	Box,
	Button,
	CircularProgress,
	MenuItem,
	Stack,
	TextField,
	Typography,
} from "@mui/material";

import { authHeaders } from "@helpers/auth";
import { formatTimestamp } from "@helpers/formatters";
import { libraryNamesQueryOptions } from "@helpers/libraryNamesQuery";
import { queryKeys } from "@helpers/queryKeys";
import { authorableAs } from "@helpers/requestAuthorship";
import {
	MAX_NOTE_LENGTH,
	noteProblem,
	retractableBy,
	type RequestNote,
} from "@helpers/requestNotes";
import { userFacingReason } from "@helpers/userFacingReason";
import { getPatronRequestNotes } from "@queries/getPatronRequestNotes";
import { addPatronRequestNote, retractPatronRequestNote } from "@mutations/requestNotes";
import Confirmation from "@components/Confirmation/Confirmation";
import TimedAlert from "@components/TimedAlert/TimedAlert";
import { useAnnounce } from "@/hooks/useAnnouncer";
import { useClock } from "@/hooks/useThemeStore";

interface RequestNotesProps {
	apiBase: string;
	patronRequestId: string;
	/** The user's own libraries. */
	agencyCodes: readonly string[];
	/** LIBRARY_ADMIN: dcb-service lets read-only staff read notes, not write them. */
	canWrite: boolean;
}

interface NotesPage {
	involvedAgencyCodes: string[] | null;
	notes: { content: RequestNote[] | null; totalSize: number | null } | null;
}

// dcb-service serves at most 50; 20 keeps the first view short
const PAGE_SIZE = 20;

/** A request's notes, newest first, and for its libraries' administrators, writing and removing their own. docs/request-notes.md. */
export default function RequestNotes({
	apiBase,
	patronRequestId,
	agencyCodes,
	canWrite,
}: RequestNotesProps) {
	const { t } = useTranslation();
	const announce = useAnnounce();
	const clock = useClock();
	const queryClient = useQueryClient();
	const notesKey = queryKeys.patronRequests.notes(apiBase, patronRequestId);

	const notesQuery = useInfiniteQuery({
		queryKey: notesKey,
		// Another library may write on the same request; a minute old is fresh enough to read
		staleTime: 60 * 1000,
		initialPageParam: 0,
		queryFn: async ({ pageParam }) =>
			(
				await request<{ patronRequests: { content: NotesPage[] } }>(
					`${apiBase}/graphql`,
					getPatronRequestNotes,
					{ query: `id:${patronRequestId}`, pageno: pageParam, pagesize: PAGE_SIZE },
					await authHeaders(),
				)
			).patronRequests?.content?.[0] ?? null,
		getNextPageParam: (last, pages) => {
			const loaded = pages.reduce((sum, page) => sum + (page?.notes?.content?.length ?? 0), 0);
			return loaded < (last?.notes?.totalSize ?? 0) ? pages.length : undefined;
		},
	});

	const pages = notesQuery.data?.pages ?? [];
	const notes = pages.flatMap((page) => page?.notes?.content ?? []);
	const authorable = authorableAs(agencyCodes, pages[0]?.involvedAgencyCodes ?? []);

	const named = [
		...new Set([
			...notes.flatMap((note) => (note.agencyCode && !note.libraryName ? [note.agencyCode] : [])),
			...authorable,
		]),
	].sort();
	const namesQuery = useQuery({
		...libraryNamesQueryOptions(apiBase, named),
		enabled: named.length > 0,
	});
	const nameOf = (code: string) =>
		namesQuery.data?.libraries?.content?.find((library) => library.agencyCode === code)
			?.fullName ?? code;
	const authorOf = (note: RequestNote) =>
		note.authorKind === "CONSORTIUM"
			? t("patron_request.notes.consortium")
			: (note.libraryName ?? nameOf(note.agencyCode ?? ""));

	const [chosenAs, setChosenAs] = useState("");
	const writeAs = authorable.includes(chosenAs) ? chosenAs : (authorable[0] ?? "");
	const [draft, setDraft] = useState("");
	const [touched, setTouched] = useState(false);
	const problem = noteProblem(draft);
	const showProblem = touched && problem !== null;
	const [retracting, setRetracting] = useState<RequestNote | null>(null);
	const [failure, setFailure] = useState<string | null>(null);

	const onFailure = (error: unknown) =>
		setFailure(userFacingReason(error) ?? t("patron_request.notes.failed"));

	const add = useMutation({
		mutationFn: async () =>
			request(
				`${apiBase}/graphql`,
				addPatronRequestNote,
				{ patronRequestId, body: draft.trim(), agencyCode: writeAs },
				await authHeaders(),
			),
		onSuccess: () => {
			setDraft("");
			setTouched(false);
			announce(t("patron_request.notes.added"));
			return queryClient.invalidateQueries({ queryKey: notesKey });
		},
		onError: onFailure,
	});

	const retract = useMutation({
		mutationFn: async (id: string) =>
			request(`${apiBase}/graphql`, retractPatronRequestNote, { id }, await authHeaders()),
		onSuccess: () => {
			announce(t("patron_request.notes.removed"));
			return queryClient.invalidateQueries({ queryKey: notesKey });
		},
		onError: onFailure,
	});

	return (
		<Stack component="section" spacing={1} aria-labelledby="request-notes-heading">
			<Typography id="request-notes-heading" variant="h3" sx={{ fontWeight: "bold" }}>
				{t("patron_request.notes.title")}
			</Typography>
			{canWrite && notesQuery.isSuccess ? (
				authorable.length === 0 ? (
					<Typography variant="body2">{t("patron_request.notes.not_involved")}</Typography>
				) : (
					<Stack
						spacing={1}
						component="form"
						noValidate
						onSubmit={(event) => {
							event.preventDefault();
							setTouched(true);
							if (problem === null) add.mutate();
						}}>
						{authorable.length > 1 ? (
							<TextField
								select
								id="request-note-as"
								size="small"
								label={t("patron_request.notes.as")}
								value={writeAs}
								onChange={(event) => setChosenAs(event.target.value)}
								sx={{ maxWidth: 360 }}>
								{authorable.map((code) => (
									<MenuItem key={code} value={code}>
										{nameOf(code)}
									</MenuItem>
								))}
							</TextField>
						) : null}
						<TextField
							id="request-note-body"
							label={t("patron_request.notes.add_label")}
							multiline
							minRows={2}
							value={draft}
							onChange={(event) => setDraft(event.target.value)}
							onBlur={() => setTouched(draft.length > 0)}
							error={showProblem}
							helperText={
								showProblem
									? t(problem ?? "", { max: MAX_NOTE_LENGTH })
									: t("patron_request.notes.helper", {
											count: draft.trim().length,
											max: MAX_NOTE_LENGTH,
										})
							}
						/>
						<Box>
							<Button type="submit" variant="outlined" disabled={add.isPending}>
								{t("patron_request.notes.add")}
							</Button>
						</Box>
					</Stack>
				)
			) : null}
			{notesQuery.isPending ? (
				<CircularProgress size="1rem" aria-label={t("ui.info.loading.value")} />
			) : notesQuery.isError ? (
				<Typography variant="body2">{t("patron_request.notes.load_failed")}</Typography>
			) : notes.length === 0 ? (
				<Typography variant="body2">{t("patron_request.notes.none")}</Typography>
			) : (
				<Box component="ol" sx={{ listStyle: "none", p: 0, m: 0, display: "grid", gap: 1.5 }}>
					{notes.map((note) => (
						<Box component="li" key={note.id} sx={{ minWidth: 0 }}>
							<Typography variant="body2" sx={{ fontWeight: "bold" }}>
								{t("patron_request.notes.byline", {
									author: authorOf(note),
									when: formatTimestamp(note.dateCreated, clock),
								})}
							</Typography>
							{note.retracted ? (
								<Typography variant="body2" sx={{ fontStyle: "italic" }}>
									{note.retractedBy === "CONSORTIUM"
										? t("patron_request.notes.removed_by_consortium")
										: t("patron_request.notes.removed_by", { library: authorOf(note) })}
								</Typography>
							) : (
								// Plain text, as dcb-service requires: shown as written, never as markup
								<Typography variant="body1" sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
									{note.body}
								</Typography>
							)}
							{canWrite && retractableBy(note, authorable) ? (
								<Button
									size="small"
									disabled={retract.isPending}
									aria-label={t("patron_request.notes.remove_label", {
										author: authorOf(note),
										when: formatTimestamp(note.dateCreated, clock),
									})}
									onClick={() => setRetracting(note)}>
									{t("patron_request.notes.remove")}
								</Button>
							) : null}
						</Box>
					))}
				</Box>
			)}
			{notesQuery.hasNextPage ? (
				<Box>
					<Button
						size="small"
						disabled={notesQuery.isFetchingNextPage}
						onClick={() => void notesQuery.fetchNextPage()}>
						{t("patron_request.notes.older")}
					</Button>
				</Box>
			) : null}
			<Confirmation
				open={retracting !== null}
				onClose={() => setRetracting(null)}
				onConfirm={() => {
					if (retracting) retract.mutate(retracting.id);
					setRetracting(null);
				}}
				action="retractNote"
				entityName=""
				gridEdit={false}
			/>
			<TimedAlert
				open={failure !== null}
				severityType="error"
				alertText={failure ?? ""}
				key="request-notes-failure"
				onCloseFunc={() => setFailure(null)}
			/>
		</Stack>
	);
}
