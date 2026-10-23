import { describe, expect, it } from "vitest";

import { requestingSearchSchema } from "../src/helpers/requestingSearch";
import { MAX_PAGE, MAX_PAGE_SIZE } from "../src/constants/dataGrid/pagination";

const parse = (search: Record<string, unknown>) =>
	requestingSearchSchema.parse(search);

describe("the requesting search, in the URL", () => {
	it("keeps a well-formed search, with a one-based page", () => {
		expect(
			parse({ filters: '(title all "Middlemarch")', page: 3, pageSize: 50 }),
		).toEqual({ filters: '(title all "Middlemarch")', page: 3, pageSize: 50 });
	});

	it("never lets a hand-typed page size past the bound", () => {
		expect(parse({ pageSize: 100000 }).pageSize).toBeUndefined();
		expect(parse({ pageSize: "7" }).pageSize).toBeUndefined();
		expect(parse({ pageSize: MAX_PAGE_SIZE }).pageSize).toBe(MAX_PAGE_SIZE);
	});

	it("drops a page number that is not one", () => {
		expect(parse({ page: "abc" }).page).toBeUndefined();
		expect(parse({ page: 0 }).page).toBeUndefined();
		expect(parse({ page: 1.5 }).page).toBeUndefined();
	});

	it("drops a page past any a person pages to, which is an offset of millions", () => {
		expect(parse({ page: MAX_PAGE + 1 }).page).toBe(MAX_PAGE + 1);
		expect(parse({ page: 200000 }).page).toBeUndefined();
	});

	it("reads a number-shaped filter as text rather than crashing the parser", () => {
		// The router JSON-parses `?filters=12345` into a number.
		expect(parse({ filters: 12345 }).filters).toBe("12345");
		expect(parse({ filters: { a: 1 } }).filters).toBeUndefined();
	});
});

describe("a link written before 2.0.0", () => {
	it("still opens its page: pageno was zero-based", () => {
		expect(parse({ filters: "keyword:middlemarch", pageno: 2, pagesize: 10 })).toEqual({
			filters: "keyword:middlemarch",
			page: 3,
			pageSize: 10,
		});
	});

	it("gives way to the new names when a link has both", () => {
		expect(parse({ page: 5, pageno: 1, pageSize: 50, pagesize: 10 })).toEqual({
			page: 5,
			pageSize: 50,
		});
	});

	it("is checked like a new one", () => {
		expect(parse({ pageno: -1, pagesize: 100000 })).toEqual({});
		expect(parse({ pageno: MAX_PAGE + 1 }).page).toBeUndefined();
	});
});
