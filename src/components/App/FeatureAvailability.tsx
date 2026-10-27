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
	capability,
	capabilityStatus,
	meetsServiceVersion,
} from "@constants/serviceCapabilities";
import { isCapabilityEnabled, isDiscoveryActive } from "@helpers/featureFlags";
import { useServiceVersion } from "@/hooks/useServiceVersion";

// What patrons see through a discovery front end: nothing to say where none is deployed
const DISCOVERY_ONLY = new Set(["library_branding", "library_support_url", "announcements"]);

// Not every registry row: a row here is a feature a library would notice, over every
// capability it is made of, and needs the newest of them
const FEATURES: readonly { id: string; capabilities: readonly string[] }[] = [
	{ id: "library_branding", capabilities: ["library_branding"] },
	{ id: "announcements", capabilities: ["announcements"] },
	{ id: "library_support_url", capabilities: ["library_support_url"] },
	{ id: "insights", capabilities: ["insights", "insights_trends", "insights_walk_up"] },
	{ id: "guarded_cleanup", capabilities: ["guarded_cleanup"] },
	{ id: "request_tags", capabilities: ["request_tags"] },
	{ id: "request_notes", capabilities: ["request_notes"] },
	{ id: "pickup_requests", capabilities: ["pickup_requests"] },
	{ id: "agency_scoped_requests", capabilities: ["agency_scoped_requests"] },
];

const newest = (versions: readonly (string | null)[]): string | null =>
	versions.reduce((latest, since) =>
		latest === null || since === null
			? null
			: meetsServiceVersion(since, latest)
				? since
				: latest,
	);

/**
 * Which features need which DCB service release, and whether this deployment has them, so
 * a library can tell a feature absent because of the service's version from a fault.
 * docs/service-compatibility.md.
 */
export function FeatureAvailability() {
	const { t } = useTranslation();
	const version = useServiceVersion();
	const discoveryActive = isDiscoveryActive();

	// A feature in no release is never named: since is null only for unreleased work
	const rows = FEATURES.filter((feature) => discoveryActive || !DISCOVERY_ONLY.has(feature.id))
		.map((feature) => {
			const parts = feature.capabilities.map(capability);
			return {
				id: feature.id,
				since: newest(parts.map((part) => part.since)),
				enabled: parts.every((part) => isCapabilityEnabled(part.flag)),
			};
		})
		.filter((feature) => feature.since !== null);

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
						{rows.map((feature) => (
							<TableRow key={feature.id}>
								<TableCell component="th" scope="row">
									{t(`feature_availability.feature.${feature.id}`)}
								</TableCell>
								<TableCell>
									{t("feature_availability.needs_version", {
										version: feature.since,
									})}
								</TableCell>
								<TableCell>
									{version === undefined
										? t("feature_availability.checking")
										: t(
												`feature_availability.status.${capabilityStatus(
													feature.since,
													feature.enabled,
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
