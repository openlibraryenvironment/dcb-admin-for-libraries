import { OPTIONAL_QUERY } from "@helpers/serviceErrors";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import axios from "axios";

import { serviceVersionFrom } from "@constants/serviceCapabilities";
import { queryKeys } from "@helpers/queryKeys";

// A dcb-service's version changes only when it is redeployed
const INFO_STALE_TIME = 2 * 60 * 60 * 1000;

/** The dcb-service version this deployment reports on /info: undefined while loading, null when it cannot be read. */
export function useServiceVersion(): string | null | undefined {
	const { cfg } = useRouter().options.context as {
		cfg?: { VITE_DCB_API_BASE?: string };
	};
	const apiBase = cfg?.VITE_DCB_API_BASE;

	const { data, isError } = useQuery({
		queryKey: queryKeys.serviceInfo.version(apiBase ?? ""),
		meta: OPTIONAL_QUERY,
		queryFn: async () => serviceVersionFrom((await axios.get(apiBase + "/info")).data),
		enabled: !!apiBase,
		staleTime: INFO_STALE_TIME,
		gcTime: INFO_STALE_TIME,
		retry: 1,
		refetchOnWindowFocus: false,
	});

	return isError ? null : data;
}
