import MuiLink from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import {
	StatementPage,
	StatementSection,
} from "@components/App/StatementPage";
import { pageTitle } from "@helpers/pageTitle";

/**
 * Every claim here maps to something in this repository, and a claim that stops
 * being true is a defect. The "how that is checked" section names the gates in
 * e2e/accessibility.spec.ts and tests/themeContrast.test.ts; the "where we fall
 * short" section is the honest half, and the reason this is a page rather than
 * a marketing line.
 */
export const Route = createFileRoute("/__authenticated/accessibility")({
	head: () => ({ meta: [{ title: pageTitle("legal.accessibility.title") }] }),
	component: RouteComponent,
});

function RouteComponent() {
	const { t } = useTranslation();

	return (
		<StatementPage title={t("legal.accessibility.title")}>
			{(
				["scope", "standard", "tested", "limits", "settings"] as const
			).map((section) => (
				<StatementSection
					key={section}
					heading={t(`legal.accessibility.${section}_heading`)}>
					<Typography>
						{t(`legal.accessibility.${section}_body`)}
					</Typography>
				</StatementSection>
			))}

			<StatementSection heading={t("legal.accessibility.report_heading")}>
				<Typography>{t("legal.accessibility.report_body")}</Typography>
				<Typography>
					<MuiLink href={`mailto:${t("legal.accessibility.report_email")}`}>
						{t("legal.accessibility.report_email")}
					</MuiLink>
				</Typography>
			</StatementSection>
		</StatementPage>
	);
}
