import { useTranslation } from "react-i18next";
import { Alert, Typography } from "@mui/material";

import { Attribute } from "@components/Attribute/Attribute";
import { formatTimestamp } from "@helpers/formatters";
import { lastPingView } from "@helpers/hostLmsLastPing";
import { useClock } from "@/hooks/useThemeStore";

/** DCB's last connection check of one of the library's systems, for its administrators. docs/library-details.md. */
export default function HostLmsConnection({ lastPing }: { lastPing: unknown }) {
	const { t } = useTranslation();
	const clock = useClock();
	const view = lastPingView(lastPing);

	return (
		<Attribute label={t("library.service.connection.title")}>
			{view ? (
				<Alert severity={view.severity} sx={{ mt: 0.5 }}>
					<Typography component="p" sx={{ fontWeight: "bold" }}>
						{t(`library.service.connection.state.${view.state}`)}
					</Typography>
					<Typography component="p">{t(`library.service.connection.advice.${view.state}`)}</Typography>
					{view.checkedAt ? (
						<Typography component="p" variant="body2">
							{t("library.service.connection.checked_at", {
								when: formatTimestamp(view.checkedAt, clock),
							})}
						</Typography>
					) : null}
					{view.state !== "ok" ? (
						<Typography component="p" variant="body2">
							{view.lastOkAt
								? t("library.service.connection.last_ok_at", {
										when: formatTimestamp(view.lastOkAt, clock),
									})
								: t("library.service.connection.never_ok")}
						</Typography>
					) : null}
				</Alert>
			) : (
				<Typography variant="attributeText">{t("library.service.connection.none")}</Typography>
			)}
		</Attribute>
	);
}
