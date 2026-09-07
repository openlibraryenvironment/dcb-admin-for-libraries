import { useQuery } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import axios from "axios";

import {
	areBrandUploadsAvailable,
	brandAssetStoreFrom,
} from "@constants/discoveryBranding";

/**
 * Whether to offer the brand image upload control — R-17b.
 *
 * A deployment with `dcb.branding.assets.store=none` has no upload route at all, so the
 * button could only ever 404. dcb-service publishes the fact on `/info` precisely so this
 * decision can be made before the administrator has picked a file.
 *
 * <h2>The default is available, not unavailable</h2>
 *
 * Every path that does not produce an explicit "none" — request in flight, request failed,
 * no API base configured, a service older than the branding block — resolves to true. That
 * is deliberate: hiding the control would remove a working feature whenever /info is
 * briefly unreachable, with nothing on screen to explain it, whereas showing it costs a
 * clear refusal at Save that dcb-service already writes. Hiding a button is UX here, not
 * authorisation — the role check on the upload route is the control.
 *
 * <h2>Two hours</h2>
 *
 * The asset store is deployment configuration; it changes when the service is redeployed
 * and not otherwise. Matching dcb-admin-ui's /info cadence rather than re-asking on every
 * mount of the library form.
 */
const INFO_STALE_TIME = 2 * 60 * 60 * 1000;

export function useBrandUploadsAvailable(): boolean {
	// Narrower than the `{ cfg: any }` the rest of this app asserts: the only key read
	// here is the API base, and naming it is what makes the assertion checkable.
	const { cfg } = useRouter().options.context as {
		cfg?: { VITE_DCB_API_BASE?: string };
	};
	const apiBase = cfg?.VITE_DCB_API_BASE;

	const { data } = useQuery({
		queryKey: ["dcbServiceInfo", "brandAssetStore", apiBase],
		queryFn: async () => {
			const response = await axios.get(apiBase + "/info");
			return brandAssetStoreFrom(response.data);
		},
		enabled: !!apiBase,
		staleTime: INFO_STALE_TIME,
		gcTime: INFO_STALE_TIME,
		// One retry. /info is cheap and unauthenticated, but a deployment that cannot
		// answer it is not one worth blocking a form over - the fallback below is safe.
		retry: 1,
		refetchOnWindowFocus: false,
	});

	// `data` is undefined until the query resolves, and stays undefined if it fails or is
	// disabled. undefined -> null -> available.
	return areBrandUploadsAvailable(data ?? null);
}
