import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * A query key is cache identity. A credential in one changes on every silent
 * renewal, refetching every mounted query at once, and leaves a copy of the token
 * in the cache. Where the token is read instead: docs/auth.md.
 */
const CREDENTIAL = /\b(headers|token|access_token|accessToken|authorization|bearer)\b/i;

const sources = (dir: string): string[] =>
	readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const path = join(dir, entry.name).replaceAll("\\", "/");
		if (entry.isDirectory()) return sources(path);
		return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)
			? [path]
			: [];
	});

const withoutComments = (text: string) =>
	text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

const OPEN = "([{";
const CLOSE = ")]}";

/** From `start`, up to the first `stop` character at bracket depth zero. */
const expressionAt = (text: string, start: number, stop: string): string => {
	let depth = 0;
	for (let i = start; i < text.length; i++) {
		const char = text[i];
		if (OPEN.includes(char)) depth++;
		else if (CLOSE.includes(char)) {
			if (depth === 0) return text.slice(start, i);
			depth--;
		} else if (depth === 0 && stop.includes(char)) {
			return text.slice(start, i);
		}
	}
	return text.slice(start);
};

/** Every `queryKey:` value, and every declaration whose name says it builds keys. */
const keyDefinitions = (text: string): string[] => {
	const code = withoutComments(text);
	const properties = [...code.matchAll(/\bqueryKey\s*:/g)].map((match) =>
		expressionAt(code, match.index + match[0].length, ",;"),
	);
	const factories = [
		...code.matchAll(/\b(?:const|function)\s+\w*(?:Key|Keys)\b/g),
	].map((match) => expressionAt(code, match.index + match[0].length, ";"));
	return [...properties, ...factories];
};

describe("query keys", () => {
	const definitions = sources("src").flatMap((file) =>
		keyDefinitions(readFileSync(file, "utf8")).map((key) => ({ file, key })),
	);

	it("are all found, so the check below cannot pass vacuously", () => {
		expect(definitions.length).toBeGreaterThanOrEqual(45);
	});

	it("carry no token, header or other credential", () => {
		const offending = definitions
			.filter(({ key }) => CREDENTIAL.test(key))
			.map(({ file, key }) => `${file}: ${key.replace(/\s+/g, " ").trim()}`);
		expect(offending).toEqual([]);
	});

	it("would see a credential in an inline key or a factory", () => {
		expect(
			keyDefinitions(`useQuery({ queryKey: ["x", id, headers], queryFn })`).some(
				(key) => CREDENTIAL.test(key),
			),
		).toBe(true);
		expect(
			keyDefinitions(
				`const listKey = (base: string, token: string) =>\n\t["x", base, token] as const;`,
			).some((key) => CREDENTIAL.test(key)),
		).toBe(true);
	});
});
