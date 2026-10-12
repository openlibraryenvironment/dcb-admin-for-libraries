import axios, { AxiosInstance } from "axios";
import { authHeaders } from "@helpers/auth";

// A plain function so the same client can be built in a route loader, which cannot call
// hooks, and in a component via useDcbRestClient. The statistics endpoints are REST.
export function createRestClient(apiBase: string | undefined): AxiosInstance {
	const client = axios.create({ baseURL: apiBase || "" });
	client.interceptors.request.use(async (config) => {
		config.headers.set(await authHeaders());
		return config;
	});
	return client;
}
