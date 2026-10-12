import { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Box, Button, Skeleton, Typography } from "@mui/material";

interface PanelStateProps {
	isLoading: boolean;
	isError: boolean;
	isEmpty: boolean;
	onRetry: () => void;
	isRetrying?: boolean;
	/** Every state occupies this height, so a panel never resizes as it settles. */
	height: number;
	/** What would put data here, when the generic line is not the useful answer. */
	emptyKey?: string;
	/** Names what failed, where "this panel" is vaguer than the reader deserves. */
	failedKey?: string;
	/** Said in place of the skeleton while loading, when the wait is worth explaining. */
	computingKey?: string;
	children: () => ReactNode;
}

/**
 * The four states every Insights panel has, in one place.
 *
 * Fourteen panels here branched on the loading flag and then on the data, so a 500
 * rendered "no data" - and this app's reader has no second view to cross-check against,
 * so that was the whole answer they got. DCB Admin carries the same component.
 *
 * `children` is a function: the data branch is the only one that evaluates it, and several
 * panels index into data that is absent in the other three.
 */
export default function PanelState({
	isLoading,
	isError,
	isEmpty,
	onRetry,
	isRetrying = false,
	height,
	emptyKey = "insights.no_data",
	failedKey = "insights.panel.failed",
	computingKey,
	children,
}: PanelStateProps) {
	const { t } = useTranslation();

	const centred = (content: ReactNode) => (
		<Box
			sx={{
				minHeight: height,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
			}}
		>
			{content}
		</Box>
	);

	if (isLoading && computingKey) {
		return centred(<Alert severity="info">{t(computingKey)}</Alert>);
	}

	if (isLoading) {
		return <Skeleton variant="rounded" height={height} />;
	}

	if (isError) {
		return centred(
			<Alert
				severity="warning"
				action={
					<Button
						color="inherit"
						size="small"
						onClick={onRetry}
						disabled={isRetrying}
					>
						{t("insights.panel.retry")}
					</Button>
				}
			>
				{t(failedKey)}
			</Alert>,
		);
	}

	if (isEmpty) {
		return centred(
			<Typography color="text.secondary">{t(emptyKey)}</Typography>,
		);
	}

	return <>{children()}</>;
}
