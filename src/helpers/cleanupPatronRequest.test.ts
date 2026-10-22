import { beforeEach, describe, expect, it, vi } from "vitest";
import axios from "axios";
import {
	cleanupPatronRequest,
	isBorrowedByCaller,
	isCleanupEligible,
	isSuppliedByCaller,
	type CleanupCaller,
} from "@helpers/cleanupPatronRequest";

vi.mock("axios", () => ({
	default: {
		post: vi.fn(),
		isAxiosError: (error: any) => Boolean(error?.isAxiosError),
	},
}));

vi.mock("@helpers/auth", () => ({
	authHeaders: async () => ({ Authorization: "Bearer current" }),
}));

const post = axios.post as unknown as ReturnType<typeof vi.fn>;

const httpError = (status: number, data?: unknown) => ({
	isAxiosError: true,
	response: { status, data },
});

const urls = () => post.mock.calls.map((call) => String(call[0]));

const suppliedByUs = {
	status: "ERROR",
	suppliers: [{ localAgency: "AG_A", isActive: true }],
};

const borrowedByUs = {
	status: "ERROR",
	patronHostlmsCode: "LMS_B",
	requestingIdentity: { resolvedAgency: { code: "AG_B" } },
	suppliers: [{ localAgency: "AG_A", isActive: true }],
};

const caller = (
	overrides: Partial<CleanupCaller> = {},
): CleanupCaller => ({
	agencyCodes: ["AG_A"],
	agencyScoped: true,
	guarded: true,
	...overrides,
});

describe("who may clean a request up", () => {
	it("recognises a request this library supplied", () => {
		expect(isSuppliedByCaller(suppliedByUs, ["AG_A"])).toBe(true);
		expect(isSuppliedByCaller(suppliedByUs, ["AG_B"])).toBe(false);
		expect(isSuppliedByCaller({ status: "ERROR" }, ["AG_A"])).toBe(false);
	});

	it("recognises the borrowing library by agency where requests are agency scoped", () => {
		const scoped = { agencyCodes: ["AG_B"], agencyScoped: true };

		expect(isBorrowedByCaller(borrowedByUs, scoped)).toBe(true);
		expect(isBorrowedByCaller(borrowedByUs, { ...scoped, agencyCodes: ["AG_C"] })).toBe(false);
		expect(
			isBorrowedByCaller({ ...borrowedByUs, requestingIdentity: null }, scoped),
		).toBe(false);
	});

	it("recognises the borrowing library by Host LMS where they are not", () => {
		const legacy = { agencyCodes: ["AG_B"], agencyScoped: false };

		expect(isBorrowedByCaller(borrowedByUs, { ...legacy, hostLmsCode: "LMS_B" })).toBe(true);
		expect(isBorrowedByCaller(borrowedByUs, { ...legacy, hostLmsCode: "LMS_C" })).toBe(false);
		expect(isBorrowedByCaller(borrowedByUs, legacy)).toBe(false);
	});

	it("offers cleanup to the borrowing library and to a supplying one, as dcb-service allows", () => {
		expect(isCleanupEligible(borrowedByUs, caller({ agencyCodes: ["AG_B"] }))).toBe(true);
		expect(isCleanupEligible(borrowedByUs, caller({ agencyCodes: ["AG_A"] }))).toBe(true);
		expect(isCleanupEligible(borrowedByUs, caller({ agencyCodes: ["AG_C"] }))).toBe(false);
		expect(
			isCleanupEligible(
				borrowedByUs,
				caller({ agencyCodes: ["AG_B"], agencyScoped: false, guarded: false, hostLmsCode: "LMS_B" }),
			),
		).toBe(true);
	});

	it("against 8.71.0 offers only requests whose item has not left the library", () => {
		const options = caller({ guarded: false });

		expect(isCleanupEligible(suppliedByUs, options)).toBe(true);
		expect(
			isCleanupEligible({ ...suppliedByUs, status: "PICKUP_TRANSIT" }, options),
		).toBe(false);
		expect(
			isCleanupEligible({ ...suppliedByUs, status: "LOANED" }, options),
		).toBe(false);
	});

	it("against 9.0.0 and later lets the server decide, short of the terminal states", () => {
		const options = caller();

		expect(
			isCleanupEligible({ ...suppliedByUs, status: "PICKUP_TRANSIT" }, options),
		).toBe(true);
		expect(
			isCleanupEligible({ ...suppliedByUs, status: "FINALISED" }, options),
		).toBe(false);
	});
});

describe("cleaning up one request", () => {
	beforeEach(() => {
		post.mockReset();
		post.mockResolvedValue({ data: {} });
	});

	it("checks for updates first, then cleans up", async () => {
		const outcome = await cleanupPatronRequest(
			"/api",
			{ id: "pr-1", status: "REQUEST_PLACED_AT_SUPPLYING_AGENCY" },
			{ refreshFirst: true },
		);

		expect(outcome).toEqual({ kind: "cleaned" });
		expect(urls()).toEqual([
			"/api/patrons/requests/pr-1/update",
			"/api/patrons/requests/pr-1/transition/cleanup",
		]);
	});

	it("does not poll a status dcb-service will not track", async () => {
		await cleanupPatronRequest(
			"/api",
			{ id: "pr-1", status: "ERROR" },
			{ refreshFirst: true },
		);

		expect(urls()).toEqual(["/api/patrons/requests/pr-1/transition/cleanup"]);
	});

	it("sends no override unless asked", async () => {
		await cleanupPatronRequest("/api", { id: "pr-1", status: "ERROR" });

		expect(post.mock.calls[0][2]).not.toHaveProperty("params");
		expect(post.mock.calls[0][2]).toEqual({
			headers: { Authorization: "Bearer current" },
		});
	});

	it("overrides with force=true, without polling again", async () => {
		await cleanupPatronRequest(
			"/api",
			{ id: "pr-1", status: "LOANED" },
			{ refreshFirst: true, override: true },
		);

		expect(urls()).toEqual(["/api/patrons/requests/pr-1/transition/cleanup"]);
		expect(post.mock.calls[0][2]).toEqual({
			headers: { Authorization: "Bearer current" },
			params: { force: true },
		});
	});

	it("reports a refusal, a refusal of access, and a failure apart", async () => {
		post.mockRejectedValueOnce(
			httpError(409, {
				detail: "The item for this request is not back at the supplying library.",
				lastKnownItemOutStatus: "PICKUP_TRANSIT",
			}),
		);
		expect(
			await cleanupPatronRequest("/api", { id: "pr-1", status: "ERROR" }),
		).toEqual({
			kind: "refused",
			status: "PICKUP_TRANSIT",
			detail: "The item for this request is not back at the supplying library.",
		});

		post.mockRejectedValueOnce(httpError(403));
		expect(
			await cleanupPatronRequest("/api", { id: "pr-1", status: "ERROR" }),
		).toEqual({ kind: "forbidden" });

		post.mockRejectedValueOnce(httpError(500, { detail: "Cleanup failed" }));
		expect(
			await cleanupPatronRequest("/api", { id: "pr-1", status: "ERROR" }),
		).toEqual({ kind: "failed", detail: "Cleanup failed" });
	});
});
