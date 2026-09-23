import { beforeEach, describe, expect, it, vi } from "vitest";
import axios from "axios";
import {
	cleanupPatronRequest,
	isCleanupEligible,
	isSuppliedByCaller,
} from "@helpers/cleanupPatronRequest";

vi.mock("axios", () => ({
	default: {
		post: vi.fn(),
		isAxiosError: (error: any) => Boolean(error?.isAxiosError),
	},
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

describe("who may clean a request up", () => {
	it("recognises a request this library supplied", () => {
		expect(isSuppliedByCaller(suppliedByUs, ["AG_A"])).toBe(true);
		expect(isSuppliedByCaller(suppliedByUs, ["AG_B"])).toBe(false);
		expect(isSuppliedByCaller({ status: "ERROR" }, ["AG_A"])).toBe(false);
	});

	it("never offers cleanup for a request this library only borrowed", () => {
		// Cleanup deletes the borrowing library's temporary records; the supplying
		// library is the one left with an item to account for.
		expect(
			isCleanupEligible(suppliedByUs, { guarded: false, agencyCodes: ["AG_B"] }),
		).toBe(false);
		expect(
			isCleanupEligible(suppliedByUs, { guarded: true, agencyCodes: ["AG_B"] }),
		).toBe(false);
	});

	it("against 8.71.0 offers only requests whose item has not left the library", () => {
		const options = { guarded: false, agencyCodes: ["AG_A"] };

		expect(isCleanupEligible(suppliedByUs, options)).toBe(true);
		expect(
			isCleanupEligible({ ...suppliedByUs, status: "PICKUP_TRANSIT" }, options),
		).toBe(false);
		expect(
			isCleanupEligible({ ...suppliedByUs, status: "LOANED" }, options),
		).toBe(false);
	});

	it("against 9.0.0 and later lets the server decide, short of the terminal states", () => {
		const options = { guarded: true, agencyCodes: ["AG_A"] };

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
			{},
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
			{},
			{ id: "pr-1", status: "ERROR" },
			{ refreshFirst: true },
		);

		expect(urls()).toEqual(["/api/patrons/requests/pr-1/transition/cleanup"]);
	});

	it("never sends the override: this app has none", async () => {
		await cleanupPatronRequest("/api", {}, { id: "pr-1", status: "ERROR" });

		expect(post.mock.calls[0][2]).not.toHaveProperty("params");
	});

	it("reports a refusal, a refusal of access, and a failure apart", async () => {
		post.mockRejectedValueOnce(
			httpError(409, {
				detail: "The item for this request is not back at the supplying library.",
				lastKnownItemOutStatus: "PICKUP_TRANSIT",
			}),
		);
		expect(
			await cleanupPatronRequest("/api", {}, { id: "pr-1", status: "ERROR" }),
		).toEqual({
			kind: "refused",
			status: "PICKUP_TRANSIT",
			detail: "The item for this request is not back at the supplying library.",
		});

		post.mockRejectedValueOnce(httpError(403));
		expect(
			await cleanupPatronRequest("/api", {}, { id: "pr-1", status: "ERROR" }),
		).toEqual({ kind: "forbidden" });

		post.mockRejectedValueOnce(httpError(500, { detail: "Cleanup failed" }));
		expect(
			await cleanupPatronRequest("/api", {}, { id: "pr-1", status: "ERROR" }),
		).toEqual({ kind: "failed", detail: "Cleanup failed" });
	});
});
