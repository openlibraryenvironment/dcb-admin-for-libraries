import type { ReactNode } from "react";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";

import { DAYJS_LOCALES } from "@helpers/locale";
import { useAppLocale } from "@/hooks/useLocaleStore";

// Around each picker, not the app: app-wide put AdapterDayjs in the entry chunk (+2.8 KB gzipped)
export default function DateLocalizationProvider({
	children,
}: {
	children: ReactNode;
}) {
	const locale = useAppLocale();

	return (
		<LocalizationProvider
			dateAdapter={AdapterDayjs}
			adapterLocale={DAYJS_LOCALES[locale]}
		>
			{children}
		</LocalizationProvider>
	);
}
