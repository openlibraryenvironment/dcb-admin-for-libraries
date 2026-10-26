import { beforeEach, describe, expect, it, vi } from "vitest";
import axios from "axios";
import {
	confirmItemReturned,
	isConfirmReturnEligible,
} from "@helpers/confirmItemReturned";

vi.mock("axios", () => ({
	default: {
		post: vi.fn(),
		isAxiosError: (error: any) => Boolean(error?.isAxiosError),
	},
}));

vi.mock("@helpers/auth", () => ({
	authHeaders: async () => ({ Authorization: "Bearer token" }),
}));

const post = axios.post as unknown as ReturnType<typeof vi.fn>;

const httpError = (status: number, data?: unknown) => ({
	isAxiosError: true,
	response: { status, data },
});

const supplied = (status: string, localAgency = "OURS", isActive = true) => ({
	id: "pr-1",
	status,
	suppliers: [{ localAgency, isActive }],
});

describe("which requests a library can confirm returned", () => {
	it("offers a request waiting for its item to come back to the library", () => {
		expect(
			isConfirmReturnEligible(supplied("AWAITING_RETURN_TO_SUPPLIER"), ["OURS"]),
		).toBe(true);
		expect(isConfirmReturnEligible(supplied("RETURN_TRANSIT"), ["OURS"])).toBe(
			true,
		);
	});

	it("is not offered to another library, or to an earlier supplier", () => {
		expect(
			isConfirmReturnEligible(supplied("AWAITING_RETURN_TO_SUPPLIER", "THEIRS"), [
				"OURS",
			]),
		).toBe(false);
		expect(
			isConfirmReturnEligible(
				supplied("AWAITING_RETURN_TO_SUPPLIER", "OURS", false),
				["OURS"],
			),
		).toBe(false);
	});

	it("is not offered while the item has not started home", () => {
		expect(isConfirmReturnEligible(supplied("READY_FOR_PICKUP"), ["OURS"])).toBe(
			false,
		);
		expect(isConfirmReturnEligible(supplied("LOANED"), ["OURS"])).toBe(false);
	});
});

describe("confirming an item is back", () => {
	beforeEach(() => {
		post.mockReset();
	});

	it("posts to the request's confirm-returned transition", async () => {
		post.mockResolvedValue({ data: "pr-1" });

		expect(await confirmItemReturned("https://dcb", "pr-1")).toEqual({
			kind: "confirmed",
		});
		expect(post).toHaveBeenCalledWith(
			"https://dcb/patrons/requests/pr-1/transition/confirm-returned",
			{},
			{ headers: { Authorization: "Bearer token" } },
		);
	});

	it("reports a refusal with the server's reason", async () => {
		post.mockRejectedValue(httpError(409, { detail: "This request is LOANED." }));

		expect(await confirmItemReturned("https://dcb", "pr-1")).toEqual({
			kind: "refused",
			detail: "This request is LOANED.",
		});
	});

	it("reports a failure with the server's reason", async () => {
		post.mockRejectedValue(
			httpError(500, {
				status: "INTERNAL_SERVER_ERROR",
				detail: "The request is still AWAITING_RETURN_TO_SUPPLIER after the return was confirmed; see its audit log.",
			}),
		);

		expect(await confirmItemReturned("https://dcb", "pr-1")).toEqual({
			kind: "failed",
			detail: "The request is still AWAITING_RETURN_TO_SUPPLIER after the return was confirmed; see its audit log.",
		});
	});

	it("reports a request that is not the library's", async () => {
		post.mockRejectedValue(httpError(403));

		expect(await confirmItemReturned("https://dcb", "pr-1")).toEqual({
			kind: "forbidden",
		});
	});
});
