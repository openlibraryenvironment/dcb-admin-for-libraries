import { describe, expect, it } from "vitest";
import { MAX_NOTE_LENGTH, noteProblem, retractableBy, type RequestNote } from "./requestNotes";

const note: RequestNote = {
	id: "n-1",
	authorKind: "LIBRARY",
	agencyCode: "AG_A",
	libraryName: "Library A",
	body: "Spine damaged",
	dateCreated: "2026-10-26T10:00:00Z",
	retracted: false,
	retractedBy: null,
};

describe("notes on a request", () => {
	it("let a library remove its own note, once, and never another's or the consortium's", () => {
		expect(retractableBy(note, ["AG_A"])).toBe(true);
		expect(retractableBy(note, ["AG_B"])).toBe(false);
		expect(retractableBy({ ...note, retracted: true }, ["AG_A"])).toBe(false);
		expect(retractableBy({ ...note, authorKind: "CONSORTIUM", agencyCode: null }, ["AG_A"])).toBe(false);
	});

	it("take a note of 1 to 2,000 characters, as dcb-service does", () => {
		expect(noteProblem("   ")).toBe("patron_request.notes.empty");
		expect(noteProblem("x".repeat(MAX_NOTE_LENGTH))).toBeNull();
		expect(noteProblem(` ${"x".repeat(MAX_NOTE_LENGTH)} `)).toBeNull();
		expect(noteProblem("x".repeat(MAX_NOTE_LENGTH + 1))).toBe("patron_request.notes.too_long");
	});
});
