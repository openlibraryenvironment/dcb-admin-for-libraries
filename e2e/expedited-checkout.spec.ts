import { test, expect } from "./fixtures/test";
import { AGENCY_CODE } from "./fixtures/auth";
import library from "./fixtures-data/library.json" with { type: "json" };

/** Middlemarch, the first result in the default search fixture. */
const RECORD = "aaaaaaaa-0000-4000-8000-000000000001";

/**
 * On-site borrowing, as far as the item list. Written so the availability call
 * that step can make is covered before it is moved off a useEffect.
 */
const ITEM = {
	id: "item-1",
	barcode: "30001",
	status: { code: "AVAILABLE" },
	agency: { code: AGENCY_CODE, description: "E2E Test Library" },
	isRequestable: true,
	localItemType: "BOOK",
	location: { code: "MAIN", name: "Main" },
};

const openCheckout = async (
	app: import("./fixtures/test").AppFixture,
	page: import("@playwright/test").Page,
	availability: { status?: number; itemList?: unknown[] } = {},
	beforeOpening?: () => Promise<void>,
) => {
	await app.signIn();
	await app.mockGraphQL({
		LoadLibrary: library,
		LoadLibraries: library,
		LoadLocations: {
			locations: {
				totalSize: 1,
				content: [
					{
						id: "loc-1",
						name: "Main desk",
						code: "MAIN",
						agency: { name: "E2E Test Library", code: AGENCY_CODE },
					},
				],
			},
		},
	});
	await app.mockSearch();

	// EVERY search card fetches its own availability, and the Place request
	// button is disabled without it - so only calls for this record are counted,
	// and a refusal starts from the second of those, which can only be the
	// dialog's, because it shares the card's cache entry.
	const calls: string[] = [];
	await page.route("**/items/availability**", (route) => {
		const url = new URL(route.request().url());
		const mine = url.searchParams.get("clusteredBibId") === RECORD;
		if (mine) calls.push(url.href);
		if (availability.status && mine && calls.length > 1) {
			return route.fulfill({ status: availability.status, json: {} });
		}
		return route.fulfill({
			json: { itemList: availability.itemList ?? [ITEM], timings: {} },
		});
	});
	await page.route("**/patron/auth/lookup", (route) =>
		route.fulfill({ json: { status: "VALID", localPatronId: ["p1"] } }),
	);

	await page.goto("/requesting?filters=keyword%3Amiddlemarch");
	await expect(
		page.getByRole("list", { name: /search results/i }),
	).toBeVisible();

	const place = page.getByRole("button", { name: /place request/i }).first();
	await expect(place).toBeEnabled({ timeout: 15_000 });
	await beforeOpening?.();
	await place.click();
	await page.getByRole("radio", { name: /walk-up/i }).check();
	await page.getByRole("button", { name: /continue/i }).click();

	return calls;
};

test("reaches the item step and asks for availability once", async ({
	app,
	page,
}) => {
	const calls = await openCheckout(app, page);

	await page
		.getByRole("textbox", { name: /barcode/i })
		.first()
		.fill("12345");
	await page.getByRole("button", { name: /validate|next|continue/i }).first().click();

	await expect(
		page.getByRole("combobox", { name: /item local id/i }),
	).toBeVisible({ timeout: 15_000 });
	// The card asked, and the dialog was served the card's answer from cache.
	await expect.poll(() => calls.length, { timeout: 15_000 }).toBe(1);
});

/**
 * A refused fan-out is REPORTED rather than left hanging. That it is not also
 * retried is proven in tests/availabilityRetry.test.ts: the retry delay is two
 * seconds and up, so counting requests here would assert nothing.
 */
test("reports a refused availability call instead of hanging", async ({
	app,
	page,
}) => {
	await page.clock.install();
	// Past the staleTime, so the dialog has to ask again rather than reuse the
	// card's answer: that second ask is the one refused.
	const calls = await openCheckout(app, page, { status: 404 }, () =>
		page.clock.fastForward("06:00"),
	);

	await page
		.getByRole("textbox", { name: /barcode/i })
		.first()
		.fill("12345");
	await page.getByRole("button", { name: /validate|next|continue/i }).first().click();

	// One for this record's search card, one for the dialog once stale, and no more. That
	// it is not retried LATER is proven in tests/availabilityRetry.test.ts: the
	// first retry delay is two seconds and up, so a count taken here could not
	// tell a policy that refuses to retry from one that has not got round to it.
	await expect.poll(() => calls.length, { timeout: 15_000 }).toBe(2);
});
