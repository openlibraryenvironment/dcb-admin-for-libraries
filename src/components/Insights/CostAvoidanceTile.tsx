import { useTranslation } from "react-i18next";
import {
	Card,
	CardContent,
	Typography,
	Stack,
	TextField,
	InputAdornment,
	Skeleton,
	Box,
} from "@mui/material";

import { currencySymbol, formatCurrency } from "@helpers/formatters";
import { useInsightsCostStore } from "@/hooks/insightsCostStore";

// Value tile. The successful-fulfilment count comes from the combined dashboard call
// (passed in), and the monetary figure is entirely user-driven (see insightsCostStore) -
// the backend never ships a "traditional ILL cost".
export default function CostAvoidanceTile({
	fulfilled,
	unitCost,
	onUnitCostChange,
	loading = false,
}: {
	fulfilled: number;
	unitCost: number | null;
	onUnitCostChange: (cost: number | null) => void;
	loading?: boolean;
}) {
	const { t } = useTranslation();

	// Atomic selectors.
	// The store is the per-user default for a fresh visit; the URL is what a shared link
	// carries, because this is the figure most likely to end up in a board pack and a link
	// that shows the recipient a different number is worse than no link.
	const storedCost = useInsightsCostStore((s) => s.illUnitCost);
	const currency = useInsightsCostStore((s) => s.currency);
	const setStoredCost = useInsightsCostStore((s) => s.setIllUnitCost);

	const illUnitCost = unitCost ?? storedCost;
	const setIllUnitCost = (cost: number | null) => {
		setStoredCost(cost);
		onUnitCostChange(cost);
	};

	const avoidance =
		illUnitCost != null && illUnitCost >= 0 ? fulfilled * illUnitCost : null;

	const formatted =
		avoidance != null
			? formatCurrency(avoidance, currency, { maximumFractionDigits: 0 })
			: "—";

	return (
		<Card variant="outlined">
			<CardContent>
				<Typography
					variant="subtitle2"
					component="p"
					color="text.secondary"
					gutterBottom
				>
					{t("insights.kpi.cost_avoidance.title")}
				</Typography>

				{loading ? (
					<Skeleton variant="text" width="60%" height={40} />
				) : (
					<Typography variant="h4" component="p">
						{formatted}
					</Typography>
				)}

				<Typography variant="body2" color="text.secondary" gutterBottom>
					{t("insights.kpi.cost_avoidance.basis", { count: fulfilled })}
				</Typography>

				<Box sx={{ mt: 1 }}>
					<Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
						<TextField
							size="small"
							type="number"
							label={t("insights.kpi.cost_avoidance.input_label")}
							value={illUnitCost ?? ""}
							onChange={(e) =>
								setIllUnitCost(
									e.target.value === "" ? null : Number(e.target.value),
								)
							}
							slotProps={{
								input: {
									startAdornment: (
										<InputAdornment position="start">
											{currencySymbol(currency)}
										</InputAdornment>
									),
								},
								htmlInput: { min: 0, step: "0.01" },
							}}
							helperText={t("insights.kpi.cost_avoidance.input_help")}
							sx={{ maxWidth: 220 }}
						/>
					</Stack>
				</Box>
			</CardContent>
		</Card>
	);
}
