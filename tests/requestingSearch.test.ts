import { describe, expect, it } from "vitest";

import { requestingSearchSchema } from "../src/helpers/requestingSearch";
import { MAX_PAGE_SIZE } from "../src/constants/dataGrid/pagination";

const parse = (search: Record<string, unknown>) =>
	requestingSearchSchema.parse(search);

describe("the requesting search, in the URL", () => {
	it("keeps a well-formed search", () => {
		expect(
			parse({ filters: '(title all "Middlemarch")', pageno: 2, pagesize: 50 }),
		).toEqual({ filters: '(title all "Middlemarch")', pageno: 2, pagesize: 50 });
	});

	it("never lets a hand-typed page size past the bound", () => {
		expect(parse({ pagesize: 100000 }).pagesize).toBeUndefined();
		expect(parse({ pagesize: "7" }).pagesize).toBeUndefined();
		expect(parse({ pagesize: MAX_PAGE_SIZE }).pagesize).toBe(MAX_PAGE_SIZE);
	});

	it("drops a page number that is not one", () => {
		expect(parse({ pageno: "abc" }).pageno).toBeUndefined();
		expect(parse({ pageno: -1 }).pageno).toBeUndefined();
		expect(parse({ pageno: 1.5 }).pageno).toBeUndefined();
	});

	it("reads a number-shaped filter as text rather than crashing the parser", () => {
		// The router JSON-parses `?filters=12345` into a number.
		expect(parse({ filters: 12345 }).filters).toBe("12345");
		expect(parse({ filters: { a: 1 } }).filters).toBeUndefined();
	});
});
