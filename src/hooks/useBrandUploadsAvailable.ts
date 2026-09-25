import { useQuery } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import axios from "axios";

import {
	areBrandUploadsAvailable,
	brandAssetStoreFrom,
} from "@constants/discoveryBranding";
import { isDiscoveryActive } from "@helpers/featureFlags";

/**
 * Whether to offer the brand image upload control - R-17b.
 *
 * UNKNOWN IS AVAILABLE: anything short of an explicit "none" resolves to true,
 * because hiding the control when /info is briefly unreachable removes a
 * working feature with nothing on screen to explain it. Two hours, because the
 * asset store changes only on redeploy. docs/branding.md.
 */
const INFO_STALE_TIME = 2 * 60 * 60 * 1000;

export function useBrandUploadsAvailable(): boolean {
	// Narrower than the `{ cfg: any }` the rest of this app asserts: the only key read
	// here is the API base, and naming it is what makes the assertion checkable.
	const { cfg } = useRouter().options.context as {
		cfg?: { VITE_DCB_API_BASE?: string };
	};
	const apiBase = cfg?.VITE_DCB_API_BASE;

	// A deployment with no discovery front end never renders the upload control, so the
	// probe is a request whose answer nothing reads. Read here rather than at the call
	// site: the hook exists for one control, and its caller cannot skip a hook.
	const discoveryActive = isDiscoveryActive();

	const { data } = useQuery({
		queryKey: ["dcbServiceInfo", "brandAssetStore", apiBase],
		queryFn: async () => {
			const response = await axios.get(apiBase + "/info");
			return brandAssetStoreFrom(response.data);
		},
		enabled: !!apiBase && discoveryActive,
		staleTime: INFO_STALE_TIME,
		gcTime: INFO_STALE_TIME,
		// One retry. /info is cheap and unauthenticated, but a deployment that cannot
		// answer it is not one worth blocking a form over - the fallback below is safe.
		retry: 1,
		refetchOnWindowFocus: false,
	});

	// `data` is undefined until the query resolves, and stays undefined if it fails or is
	// disabled. undefined -> null -> available.
	return discoveryActive && areBrandUploadsAvailable(data ?? null);
}
