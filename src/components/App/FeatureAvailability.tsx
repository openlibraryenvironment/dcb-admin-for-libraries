import { useTranslation } from "react-i18next";
import {
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Typography,
} from "@mui/material";

import {
	SERVICE_CAPABILITIES,
	capabilityStatus,
} from "@constants/serviceCapabilities";
import { isCapabilityEnabled, isDiscoveryActive } from "@helpers/featureFlags";
import { useServiceVersion } from "@/hooks/useServiceVersion";

// What patrons see through a discovery front end: nothing to say where none is deployed
const DISCOVERY_ONLY = new Set(["library_branding", "library_support_url", "announcements"]);

/**
 * Which features need which DCB service release, and whether this deployment has them, so
 * a library can tell a feature absent because of the service's version from a fault.
 * docs/service-compatibility.md.
 */
export function FeatureAvailability() {
	const { t } = useTranslation();
	const version = useServiceVersion();
	const discoveryActive = isDiscoveryActive();

	// A capability in no release is never named: since is null only for unreleased work
	const rows = SERVICE_CAPABILITIES.filter(
		(capability) =>
			capability.since !== null &&
			(discoveryActive || !DISCOVERY_ONLY.has(capability.id)),
	);

	return (
		<>
			<Typography variant="h4" component="h3">
				{t("feature_availability.title")}
			</Typography>
			<Typography sx={{ mt: 1, mb: 2 }}>
				{t("feature_availability.intro", {
					version: version ?? t("feature_availability.version_unknown"),
				})}
			</Typography>
			<TableContainer sx={{ overflowX: "auto" }}>
				<Table size="small" aria-label={t("feature_availability.title")}>
					<TableHead>
						<TableRow>
							<TableCell component="th" scope="col">
								{t("feature_availability.column.feature")}
							</TableCell>
							<TableCell component="th" scope="col">
								{t("feature_availability.column.needs")}
							</TableCell>
							<TableCell component="th" scope="col">
								{t("feature_availability.column.status")}
							</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{rows.map((capability) => (
							<TableRow key={capability.id}>
								<TableCell component="th" scope="row">
									{t(`feature_availability.feature.${capability.id}`)}
								</TableCell>
								<TableCell>
									{t("feature_availability.needs_version", {
										version: capability.since,
									})}
								</TableCell>
								<TableCell>
									{version === undefined
										? t("feature_availability.checking")
										: t(
												`feature_availability.status.${capabilityStatus(
													capability.since,
													isCapabilityEnabled(capability.flag),
													version,
												)}`,
											)}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</TableContainer>
		</>
	);
}
