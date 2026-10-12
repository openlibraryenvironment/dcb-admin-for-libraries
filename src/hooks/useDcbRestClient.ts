import { useMemo } from "react";
import { useRouter } from "@tanstack/react-router";
import { createRestClient } from "@helpers/createRestClient";

export const useDcbRestClient = () => {
	const { cfg } = useRouter().options.context as {
		cfg?: { VITE_DCB_API_BASE?: string };
	};
	const apiBase = cfg?.VITE_DCB_API_BASE;

	return useMemo(() => createRestClient(apiBase), [apiBase]);
};
