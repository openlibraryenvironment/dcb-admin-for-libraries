import type { TFunction } from "i18next";
import { describe, expect, it } from "vitest";
import type { Schema } from "yup";

import { expeditedCheckoutSchema } from "../src/schemas/expeditedCheckout";
import { libraryProfileSchema } from "../src/schemas/libraryProfile";
import { quickWalkUpSchema } from "../src/schemas/quickWalkUp";
import { staffRequestSchema } from "../src/schemas/staffRequest";

/**
 * Echoes the key so an assertion names the message the user would see. The
 * schemas take `t` precisely so they can be exercised without i18next.
 */
const t = ((key: string) => key) as unknown as TFunction;

const messageFor = async (schema: Schema, value: unknown): Promise<string[]> => {
	try {
		await schema.validate(value, { abortEarly: false });
		return [];
	} catch (error) {
		return (error as { errors: string[] }).errors;
	}
};

describe("staffRequestSchema", () => {
	const complete = {
		patronBarcode: "123",
		agencyCode: "AG",
		pickupLocationId: "loc",
		selectionType: "automatic",
	};

	it("asks for nothing about the item under automatic selection", async () => {
		await expect(staffRequestSchema(t).isValid(complete)).resolves.toBe(true);
	});

	it("requires the item under manual selection", async () => {
		const errors = await messageFor(staffRequestSchema(t), {
			...complete,
			selectionType: "manual",
		});
		expect(errors).toHaveLength(2);
		expect(errors.every((error) => error === "ui.validation.required")).toBe(
			true,
		);
	});
});

describe("the shared patron barcode field", () => {
	it("rejects the square brackets a failed scan leaves behind", async () => {
		for (const barcode of ["[NO READ]", "123[", "]123"]) {
			expect(
				await messageFor(staffRequestSchema(t), {
					patronBarcode: barcode,
					agencyCode: "AG",
					pickupLocationId: "loc",
					selectionType: "automatic",
				}),
			).toEqual(["requesting.staff_request.patron.error.no_brackets"]);
		}
	});

	it("is the same field in both requesting forms", async () => {
		const both = [staffRequestSchema(t), expeditedCheckoutSchema(t)];
		for (const schema of both) {
			expect(
				(await messageFor(schema, { patronBarcode: "[NO READ]" })).includes(
					"requesting.staff_request.patron.error.no_brackets",
				),
			).toBe(true);
		}
	});
});

describe("quickWalkUpSchema", () => {
	it("requires all four fields", async () => {
		expect(await messageFor(quickWalkUpSchema(t), {})).toHaveLength(4);
	});
});

describe("libraryProfileSchema", () => {
	const schema = libraryProfileSchema(t);

	it("requires a full name", async () => {
		expect(await messageFor(schema, {})).toContain("ui.validation.required");
	});


	it("bounds the coordinates", async () => {
		expect(
			await messageFor(schema, { fullName: "Anytown Library", latitude: 91 }),
		).toEqual(["ui.validation.locations.lat"]);
		expect(
			await messageFor(schema, { fullName: "Anytown Library", longitude: -181 }),
		).toEqual(["ui.validation.locations.long"]);
	});

	it("rejects a logo that is not an absolute http URL", async () => {
		expect(
			await messageFor(schema, {
				fullName: "Anytown Library",
				brandLogoUrl: "javascript:alert(1)",
			}),
		).toEqual(["library.brand.logo_url_invalid"]);
	});

	it("lets a blank branding field through, because blank means clear it", async () => {
		await expect(
			schema.isValid({
				fullName: "Anytown Library",
				brandLogoUrl: "",
				patronWebsite: "",
				supportUrl: "",
			}),
		).resolves.toBe(true);
	});
});
