import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import request from "graphql-request";
import {
	Box,
	Button,
	Chip,
	CircularProgress,
	MenuItem,
	Stack,
	TextField,
	Typography,
} from "@mui/material";

import { authHeaders } from "@helpers/auth";
import { libraryNamesQueryOptions } from "@helpers/libraryNamesQuery";
import { queryKeys } from "@helpers/queryKeys";
import { authorableAs } from "@helpers/requestAuthorship";
import { addableTags, removableBy, type AppliedTag, type VocabularyTag } from "@helpers/requestTags";
import { userFacingReason } from "@helpers/userFacingReason";
import { getPatronRequestTags, getRequestTagVocabulary } from "@queries/getPatronRequestTags";
import { tagPatronRequest, untagPatronRequest } from "@mutations/requestTags";
import TimedAlert from "@components/TimedAlert/TimedAlert";
import { useAnnounce } from "@/hooks/useAnnouncer";

interface RequestTagsProps {
	apiBase: string;
	patronRequestId: string;
	/** The user's own libraries. */
	agencyCodes: readonly string[];
	/** LIBRARY_ADMIN: dcb-service lets read-only staff see tags, not change them. */
	canWrite: boolean;
}

interface TagsOfRequest {
	id: string;
	tags: AppliedTag[] | null;
	involvedAgencyCodes: string[] | null;
}

interface TagChange {
	tagCode: string;
	label: string;
	agencyCode: string;
}

/** A request's tags, and for its libraries' administrators, applying and removing their own. docs/request-tags.md. */
export default function RequestTags({
	apiBase,
	patronRequestId,
	agencyCodes,
	canWrite,
}: RequestTagsProps) {
	const { t } = useTranslation();
	const announce = useAnnounce();
	const queryClient = useQueryClient();
	const tagsKey = queryKeys.patronRequests.tags(apiBase, patronRequestId);

	const tagsQuery = useQuery({
		queryKey: tagsKey,
		// Another library may tag the same request; a minute old is fresh enough to read
		staleTime: 60 * 1000,
		queryFn: async () =>
			(
				await request<{ patronRequests: { content: TagsOfRequest[] } }>(
					`${apiBase}/graphql`,
					getPatronRequestTags,
					{ query: `id:${patronRequestId}` },
					await authHeaders(),
				)
			).patronRequests?.content?.[0] ?? null,
	});

	const vocabularyQuery = useQuery({
		queryKey: queryKeys.requestTags.vocabulary(apiBase),
		// The consortium changes its list rarely, and at most 100 tags
		staleTime: 5 * 60 * 1000,
		enabled: canWrite,
		queryFn: async () =>
			(
				await request<{ requestTags: VocabularyTag[] | null }>(
					`${apiBase}/graphql`,
					getRequestTagVocabulary,
					{},
					await authHeaders(),
				)
			).requestTags ?? [],
	});

	const applied = tagsQuery.data?.tags ?? [];
	const taggable = authorableAs(agencyCodes, tagsQuery.data?.involvedAgencyCodes ?? []);

	const named = [...new Set([...applied.flatMap((tag) => tag.agencyCodes), ...taggable])].sort();
	const namesQuery = useQuery({
		...libraryNamesQueryOptions(apiBase, named),
		enabled: named.length > 0,
	});
	const nameOf = (code: string) =>
		namesQuery.data?.libraries?.content?.find((library) => library.agencyCode === code)
			?.fullName ?? code;

	const [chosenAs, setChosenAs] = useState("");
	const writeAs = taggable.includes(chosenAs) ? chosenAs : (taggable[0] ?? "");
	const addable = addableTags(vocabularyQuery.data ?? [], applied, writeAs);
	const [chosenTag, setChosenTag] = useState("");
	const tagToAdd = addable.some((tag) => tag.code === chosenTag) ? chosenTag : "";
	const [failure, setFailure] = useState<string | null>(null);

	const change = (mutation: string, done: string) =>
		async ({ tagCode, agencyCode }: TagChange) =>
			(
				await request<Record<string, AppliedTag[]>>(
					`${apiBase}/graphql`,
					mutation,
					{ patronRequestId, tagCode, agencyCode },
					await authHeaders(),
				)
			)[done] ?? [];

	// dcb-service answers with the request's tags as they now stand, so they replace the cache
	const settle = (key: string) => ({
		onSuccess: (tags: AppliedTag[], { label }: TagChange) => {
			queryClient.setQueryData<TagsOfRequest | null>(tagsKey, (previous) =>
				previous ? { ...previous, tags } : previous,
			);
			setChosenTag("");
			announce(t(key, { tag: label }));
		},
		onError: (error: unknown) => {
			setFailure(userFacingReason(error) ?? t("patron_request.tags.failed"));
		},
	});

	const add = useMutation({
		mutationFn: change(tagPatronRequest, "tagPatronRequest"),
		...settle("patron_request.tags.added"),
	});
	const remove = useMutation({
		mutationFn: change(untagPatronRequest, "untagPatronRequest"),
		...settle("patron_request.tags.removed"),
	});
	const busy = add.isPending || remove.isPending;

	const whoApplied = (tag: AppliedTag) =>
		[
			...tag.agencyCodes.map(nameOf),
			...(tag.consortium ? [t("patron_request.tags.consortium")] : []),
		].join(", ");

	return (
		<Stack component="section" spacing={1} aria-labelledby="request-tags-heading">
			<Typography id="request-tags-heading" variant="h3" sx={{ fontWeight: "bold" }}>
				{t("patron_request.tags.title")}
			</Typography>
			{tagsQuery.isPending ? (
				<CircularProgress size="1rem" aria-label={t("ui.info.loading.value")} />
			) : tagsQuery.isError ? (
				<Typography variant="body2">{t("patron_request.tags.load_failed")}</Typography>
			) : applied.length === 0 ? (
				<Typography variant="body2">{t("patron_request.tags.none")}</Typography>
			) : (
				<Box
					component="ul"
					sx={{ listStyle: "none", p: 0, m: 0, display: "flex", flexWrap: "wrap", gap: 1 }}>
					{applied.map((tag) => (
						<Box
							component="li"
							key={tag.code}
							sx={{ display: "flex", alignItems: "center", gap: 0.5, maxWidth: "100%" }}>
							{/* A label naming several libraries wraps, or it pushes a 320px page sideways */}
							<Chip
								label={t("patron_request.tags.applied", { tag: tag.label, by: whoApplied(tag) })}
								sx={{ height: "auto", maxWidth: "100%", py: 0.5 }}
								slotProps={{ label: { sx: { whiteSpace: "normal" } } }}
							/>
							{canWrite
								? removableBy(tag, taggable).map((code, _, mine) => (
										<Button
											key={code}
											size="small"
											disabled={busy}
											// Two of the user's libraries applied it: the buttons must differ to the eye too
											aria-label={t(
												mine.length > 1
													? "patron_request.tags.remove_for_label"
													: "patron_request.tags.remove_label",
												{ tag: tag.label, library: nameOf(code) },
											)}
											onClick={() =>
												remove.mutate({ tagCode: tag.code, label: tag.label, agencyCode: code })
											}>
											{mine.length > 1
												? t("patron_request.tags.remove_for", { library: nameOf(code) })
												: t("patron_request.tags.remove")}
										</Button>
									))
								: null}
						</Box>
					))}
				</Box>
			)}
			{canWrite && tagsQuery.isSuccess ? (
				taggable.length === 0 ? (
					<Typography variant="body2">{t("patron_request.tags.not_involved")}</Typography>
				) : (
					<Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ alignItems: { sm: "flex-start" } }}>
						{taggable.length > 1 ? (
							<TextField
								select
								id="request-tag-as"
								size="small"
								label={t("patron_request.tags.as")}
								value={writeAs}
								onChange={(event) => setChosenAs(event.target.value)}
								sx={{ minWidth: 220 }}>
								{taggable.map((code) => (
									<MenuItem key={code} value={code}>
										{nameOf(code)}
									</MenuItem>
								))}
							</TextField>
						) : null}
						<TextField
							select
							id="request-tag-choice"
							size="small"
							label={t("patron_request.tags.choose")}
							value={tagToAdd}
							onChange={(event) => setChosenTag(event.target.value)}
							disabled={vocabularyQuery.isPending || addable.length === 0}
							helperText={
								vocabularyQuery.isError
									? t("patron_request.tags.vocabulary_failed")
									: vocabularyQuery.isSuccess && addable.length === 0
										? t("patron_request.tags.all_applied")
										: undefined
							}
							sx={{ minWidth: 220 }}>
							{addable.map((tag) => (
								<MenuItem key={tag.code} value={tag.code}>
									{tag.label}
								</MenuItem>
							))}
						</TextField>
						<Button
							variant="outlined"
							disabled={!tagToAdd || busy}
							onClick={() =>
								add.mutate({
									tagCode: tagToAdd,
									label: addable.find((tag) => tag.code === tagToAdd)?.label ?? tagToAdd,
									agencyCode: writeAs,
								})
							}>
							{t("patron_request.tags.add")}
						</Button>
					</Stack>
				)
			) : null}
			<TimedAlert
				open={failure !== null}
				severityType="error"
				alertText={failure ?? ""}
				key="request-tags-failure"
				onCloseFunc={() => setFailure(null)}
			/>
		</Stack>
	);
}
