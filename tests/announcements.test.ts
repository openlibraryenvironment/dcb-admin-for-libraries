import { describe, expect, it } from "vitest";

import { newestFirst, type AnnouncementRow } from "../src/helpers/announcements";

const row = (id: string, startsAt: string): AnnouncementRow => ({
	id,
	headline: id,
	body: "",
	urgent: false,
	dismissible: true,
	startsAt,
	expiresAt: "2099-01-01T00:00:00Z",
});

describe("newestFirst", () => {
	it("puts the most recently started first, as patrons see them", () => {
		const rows = [
			row("old", "2026-09-01T09:00:00Z"),
			row("newest", "2026-10-14T09:00:00Z"),
			row("middle", "2026-10-01T09:00:00Z"),
		];

		expect(newestFirst(rows).map((r) => r.id)).toEqual(["newest", "middle", "old"]);
		expect(rows.map((r) => r.id)).toEqual(["old", "newest", "middle"]);
	});
});
