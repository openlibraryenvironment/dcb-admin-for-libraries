import { useId, useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { yupResolver } from "@hookform/resolvers/yup";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DeleteOutlined } from "@mui/icons-material";
import {
	Alert,
	Box,
	Button,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	IconButton,
	List,
	ListItem,
	ListItemButton,
	ListItemText,
	Stack,
	TextField,
	Typography,
} from "@mui/material";
import { GridLogicOperator } from "@mui/x-data-grid-premium";

import { useAnnounce } from "@/hooks/useAnnouncer";
import type { GridViews } from "@/hooks/useSyncedDataGrid";
import { type FilterLabels, generateFilterDescription } from "@helpers/dataGrid/utilities";
import { queryKeys } from "@helpers/queryKeys";
import {
	MAX_SAVED_FILTER_NAME,
	MAX_SAVED_FILTERS,
	type SavedFilter,
	type SavedFilterSearch,
	SavedFilterLimitError,
	savedFilterStore,
	savedFiltersQueryOptions,
} from "@helpers/savedFilters";
import { type SavedFilterForm, savedFilterSchema } from "@/schemas/savedFilter";
import { useFilterLabels } from "./useFilterLabels";
import { Announcer } from "@components/Layout/Announcer";

const describe = (
	t: (key: string, options?: Record<string, unknown>) => string,
	labels: FilterLabels,
	search: SavedFilterSearch,
): string => {
	const filters = search.filters?.length
		? generateFilterDescription(
				{
					items: search.filters,
					logicOperator: search.logic === "or" ? GridLogicOperator.Or : GridLogicOperator.And,
				},
				labels,
			)
		: t("ui.data_grid.views.no_filter");
	if (!search.sort) return filters;
	if (search.sort === "none") return `${filters}. ${t("ui.data_grid.views.unsorted")}`;
	const [field, direction] = search.sort.split(":");
	return `${filters}. ${t(`ui.data_grid.views.sorted_${direction === "asc" ? "asc" : "desc"}`, {
		field: labels.field(field),
	})}`;
};

export default function SavedFiltersDialog({
	open,
	onClose,
	views,
}: {
	open: boolean;
	onClose: () => void;
	views: GridViews;
}) {
	const { t } = useTranslation();
	const announce = useAnnounce();
	const labels = useFilterLabels();
	const queryClient = useQueryClient();
	const titleId = useId();
	const listHeadingRef = useRef<HTMLHeadingElement>(null);

	const listKey = queryKeys.savedFilters.list(views.gridId);
	const saved = useQuery({ ...savedFiltersQueryOptions(views.gridId), enabled: open });

	const {
		control,
		handleSubmit,
		reset,
		formState: { errors },
	} = useForm<SavedFilterForm>({
		defaultValues: { name: "" },
		resolver: yupResolver(savedFilterSchema(t)),
	});

	const save = useMutation({
		mutationFn: (name: string) => savedFilterStore.save(views.gridId, name, views.current),
		onSuccess: (filter) => {
			reset({ name: "" });
			announce(t("ui.data_grid.views.saved_as", { name: filter.name }));
		},
		onSettled: () => queryClient.invalidateQueries({ queryKey: listKey }),
	});

	const remove = useMutation({
		mutationFn: (filter: SavedFilter) => savedFilterStore.remove(views.gridId, filter.id),
		onSuccess: (_result, filter) => {
			announce(t("ui.data_grid.views.deleted", { name: filter.name }));
			// The deleted row held focus; the list's heading is what is left nearest it
			listHeadingRef.current?.focus();
		},
		onSettled: () => queryClient.invalidateQueries({ queryKey: listKey }),
	});

	const apply = (filter: SavedFilter) => {
		views.apply(views.sanitise(filter.search));
		announce(t("ui.data_grid.views.applied", { name: filter.name }));
		onClose();
	};

	const canSave = (views.current.filters?.length ?? 0) > 0 || views.current.sort !== undefined;
	const filters = saved.data ?? [];

	return (
		<Dialog
			open={open}
			onClose={onClose}
			aria-labelledby={titleId}
			fullWidth
			maxWidth="sm"
			slotProps={{ transition: { onExited: () => save.reset() } }}
		>
			<DialogTitle id={titleId}>{t("ui.data_grid.views.title")}</DialogTitle>
			<DialogContent>
				{/* The app's own region is under #root, which MUI hides while a dialog is open */}
				<Announcer />
				<Stack spacing={2}>
					<Typography variant="body2" color="text.secondary">
						{t("ui.data_grid.views.session_note")}
					</Typography>

					{canSave ? (
						<Box
							component="form"
							noValidate
							onSubmit={handleSubmit(({ name }) => save.mutate(name))}
						>
							<Stack direction={{ xs: "column", sm: "row" }} spacing={1} useFlexGap>
								<Controller
									name="name"
									control={control}
									render={({ field }) => (
										<TextField
											{...field}
											label={t("ui.data_grid.views.name")}
											size="small"
											required
											fullWidth
											error={!!errors.name}
											helperText={errors.name?.message}
											slotProps={{ htmlInput: { maxLength: MAX_SAVED_FILTER_NAME } }}
										/>
									)}
								/>
								<Button
									type="submit"
									variant="contained"
									sx={{ alignSelf: "flex-start", flexShrink: 0 }}
								>
									{t("ui.data_grid.views.save")}
								</Button>
							</Stack>
						</Box>
					) : (
						<Typography>{t("ui.data_grid.views.nothing_to_save")}</Typography>
					)}

					{views.hasPrivate ? (
						<Alert severity="info">{t("ui.data_grid.views.private_not_saved")}</Alert>
					) : null}
					{save.error ? (
						<Alert severity="error">
							{save.error instanceof SavedFilterLimitError
								? t("ui.data_grid.views.limit", { count: MAX_SAVED_FILTERS })
								: t("ui.data_grid.views.save_failed")}
						</Alert>
					) : null}

					<Typography variant="h6" component="h3" ref={listHeadingRef} tabIndex={-1}>
						{t("ui.data_grid.views.list_title")}
					</Typography>
					{filters.length === 0 ? (
						<Typography>{t("ui.data_grid.views.none")}</Typography>
					) : (
						<List dense disablePadding>
							{filters.map((filter) => (
								<ListItem
									key={filter.id}
									disablePadding
									secondaryAction={
										<IconButton
											edge="end"
											aria-label={t("ui.data_grid.views.delete", { name: filter.name })}
											onClick={() => remove.mutate(filter)}
										>
											<DeleteOutlined />
										</IconButton>
									}
								>
									<ListItemButton onClick={() => apply(filter)}>
										<ListItemText
											primary={filter.name}
											secondary={describe(t, labels, views.sanitise(filter.search))}
										/>
									</ListItemButton>
								</ListItem>
							))}
						</List>
					)}
				</Stack>
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose}>{t("ui.actions.close")}</Button>
			</DialogActions>
		</Dialog>
	);
}
