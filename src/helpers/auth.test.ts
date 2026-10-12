import { QueryClient } from "@tanstack/react-query";
import {
	InMemoryWebStorage,
	User,
	WebStorageStateStore,
} from "oidc-client-ts";
import { describe, expect, it } from "vitest";

import { authHeaders, clearCacheOnSignOut, createUserManager } from "./auth";

const signedInAs = (access_token: string, sub = "librarian") =>
	new User({
		access_token,
		token_type: "Bearer",
		profile: { sub, iss: "https://keycloak.invalid", aud: "app", exp: 0, iat: 0 },
	});

const userManager = () =>
	createUserManager({
		authority: "https://keycloak.invalid/realms/dcb",
		client_id: "app",
		redirect_uri: "https://app.invalid/",
		userStore: new WebStorageStateStore({ store: new InMemoryWebStorage() }),
		stateStore: new WebStorageStateStore({ store: new InMemoryWebStorage() }),
	});

describe("authHeaders", () => {
	it("reads the token when it is called, so a renewed token is the one sent", async () => {
		const manager = userManager();
		await manager.storeUser(signedInAs("first"));
		expect(await authHeaders()).toEqual({ Authorization: "Bearer first" });

		await manager.storeUser(signedInAs("renewed"));
		expect(await authHeaders()).toEqual({ Authorization: "Bearer renewed" });
	});

	it("refuses rather than sending a request with no credential", async () => {
		userManager();
		await expect(authHeaders()).rejects.toThrow();
	});
});

describe("clearCacheOnSignOut", () => {
	const cached = () => {
		const queryClient = new QueryClient();
		queryClient.setQueryData(["library", "detail"], { fullName: "Previous Library" });
		return queryClient;
	};

	it("empties the query cache when the user is removed", async () => {
		const manager = userManager();
		const queryClient = cached();
		clearCacheOnSignOut(manager.events, queryClient);

		await manager.storeUser(signedInAs("token"));
		await manager.removeUser();

		expect(queryClient.getQueryCache().getAll()).toEqual([]);
	});

	it("empties it when the identity provider reports the session ended", async () => {
		const manager = userManager();
		const queryClient = cached();
		clearCacheOnSignOut(manager.events, queryClient);

		await manager.events._raiseUserSignedOut();

		expect(queryClient.getQueryCache().getAll()).toEqual([]);
	});

	it("leaves the cache alone on a renewal, and stops listening when disposed", async () => {
		const manager = userManager();
		const queryClient = cached();
		const dispose = clearCacheOnSignOut(manager.events, queryClient);

		await manager.events.load(signedInAs("renewed"));
		expect(queryClient.getQueryCache().getAll()).toHaveLength(1);

		dispose();
		await manager.removeUser();
		expect(queryClient.getQueryCache().getAll()).toHaveLength(1);
	});
});
