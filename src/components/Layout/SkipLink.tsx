import Link from "@mui/material/Link";
import { useTranslation } from "react-i18next";

import { MAIN_CONTENT_ID } from "@constants/landmarks";

/**
 * The first focusable thing on every page, visible only while focused.
 *
 * Without it a keyboard user passes the logo, the library selector, the sign-out
 * button and up to ten navigation tabs before reaching the page, on every
 * navigation. WCAG 2.4.1.
 */
export const SkipLink = () => {
	const { t } = useTranslation();

	return (
		<Link
			href={`#${MAIN_CONTENT_ID}`}
			sx={{
				// Off-screen rather than display:none, which would take it out of the
				// focus order and defeat the point.
				position: "absolute",
				left: -9999,
				top: 0,
				zIndex: (theme) => theme.zIndex.tooltip + 1,
				padding: 2,
				backgroundColor: "background.paper",
				color: "primary.main",
				"&:focus": {
					left: 0,
				},
			}}
		>
			{t("a11y.skip_to_content")}
		</Link>
	);
};
