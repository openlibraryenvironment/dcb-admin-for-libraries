import { useTranslation } from "react-i18next";
import Loading from "@components/Loading/Loading";

// Its own module: the route imports it eagerly, and a shared module would pull the whole dashboard into every page.
export default function InsightsPending() {
	const { t } = useTranslation();
	return <Loading title={t("insights.loading")} subtitle={t("ui.info.wait")} />;
}
