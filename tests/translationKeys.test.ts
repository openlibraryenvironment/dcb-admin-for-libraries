import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import en from "../src/locales/en/en.json";

/**
 * Every literal translation key in the source must exist in en.json.
 *
 * i18next does not throw on a missing key - it renders the key itself, so
 * "ui.data_grid.export_all_csv" appears on the export menu in front of a
 * librarian. Nothing else catches that: it type-checks, it lints, and it only
 * shows up if someone happens to open the affected screen.
 *
 * Scope and limits:
 *  - Literal keys only. `t(`a.${b}`)` and `t(variable)` cannot be checked here;
 *    they are checked by reading the code.
 *  - A call carrying an inline English default - either `defaultValue` or
 *    i18next's positional form, t("key", "Some text") - is satisfied. Those
 *    render correct text; they are a translation-coverage question, which
 *    `npm run i18n:missed` reports, not a broken screen.
 *  - Comments are stripped first, so a key inside commented-out code is not a
 *    finding.
 */

const SRC = path.resolve(import.meta.dirname, "../src");

function listSourceFiles(dir: string): string[] {
	return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) return listSourceFiles(full);
		return /\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith(".gen.ts")
			? [full]
			: [];
	});
}

/**
 * Blanks out comments while leaving string and template literals intact, so a
 * "//" inside a URL is not mistaken for the start of a comment. Characters are
 * replaced with spaces rather than removed, to keep offsets stable.
 */
function stripComments(source: string): string {
	let out = "";
	let i = 0;
	type Mode = "code" | "line" | "block" | "single" | "double" | "template";
	let mode: Mode = "code";

	while (i < source.length) {
		const c = source[i];
		const next = source[i + 1];

		if (mode === "code") {
			if (c === "/" && next === "/") {
				mode = "line";
				out += "  ";
				i += 2;
				continue;
			}
			if (c === "/" && next === "*") {
				mode = "block";
				out += "  ";
				i += 2;
				continue;
			}
			if (c === "'") mode = "single";
			else if (c === '"') mode = "double";
			else if (c === "`") mode = "template";
			out += c;
			i += 1;
			continue;
		}

		if (mode === "line") {
			if (c === "\n") {
				mode = "code";
				out += c;
			} else {
				out += " ";
			}
			i += 1;
			continue;
		}

		if (mode === "block") {
			if (c === "*" && next === "/") {
				mode = "code";
				out += "  ";
				i += 2;
				continue;
			}
			out += c === "\n" ? c : " ";
			i += 1;
			continue;
		}

		// inside a string or template literal
		if (c === "\\") {
			out += source.slice(i, i + 2);
			i += 2;
			continue;
		}
		if (
			(mode === "single" && c === "'") ||
			(mode === "double" && c === '"') ||
			(mode === "template" && c === "`")
		) {
			mode = "code";
		}
		out += c;
		i += 1;
	}
	return out;
}

/** The arguments of the t(...) call starting at `open`, or "" if unbalanced. */
function callArguments(source: string, open: number): string {
	let depth = 0;
	for (let i = open; i < source.length; i += 1) {
		if (source[i] === "(") depth += 1;
		else if (source[i] === ")") {
			depth -= 1;
			if (depth === 0) return source.slice(open + 1, i);
		}
	}
	return "";
}

/**
 * True when the call carries its own English text: `{ defaultValue: ... }`, or
 * i18next's positional form t("key", "Some text"). A second argument that is
 * an object is interpolation, not a default.
 */
function hasInlineDefault(args: string): boolean {
	if (args.includes("defaultValue")) return true;
	const [, second] = args.split(",");
	if (second === undefined) return false;
	const opener = second.trim().charAt(0);
	return opener === "'" || opener === '"' || opener === "`";
}

function resolves(key: string): boolean {
	return (
		key
			.split(".")
			.reduce<unknown>(
				(node, part) =>
					node && typeof node === "object"
						? (node as Record<string, unknown>)[part]
						: undefined,
				en,
			) !== undefined
	);
}

interface Finding {
	key: string;
	file: string;
	line: number;
}

function findMissingKeys(): Finding[] {
	const findings: Finding[] = [];
	// `t("key"` / `i18n.t("key"` / `.t("key"`, single or double quoted.
	const call = /\bt\(\s*(["'])([a-zA-Z0-9_.\-]+)\1/g;

	for (const file of listSourceFiles(SRC)) {
		const source = stripComments(fs.readFileSync(file, "utf8"));
		for (const match of source.matchAll(call)) {
			const key = match[2];
			if (resolves(key)) continue;
			const args = callArguments(source, source.indexOf("(", match.index));
			if (hasInlineDefault(args)) continue;
			findings.push({
				key,
				file: path.relative(path.dirname(SRC), file).split(path.sep).join("/"),
				line: source.slice(0, match.index).split("\n").length,
			});
		}
	}
	return findings;
}

/**
 * Keys referenced in the source that do not exist yet, and whose text is a
 * product wording decision rather than a repoint to something that already says
 * the same thing.
 *
 * Empty, and meant to stay that way. It is a ratchet asserted in both
 * directions: a NEW missing key fails the build, and an entry that has since
 * been given wording also fails, so the list cannot quietly outlive the debt it
 * records. It is not an ignore list - every line would be a screen showing a raw
 * key to a librarian.
 */
const AWAITING_WORDING = new Set<string>([]);

describe("translation keys", () => {
	it("every literal t() key exists in en.json", () => {
		const missing = findMissingKeys().filter(
			(finding) => !AWAITING_WORDING.has(finding.key),
		);
		const report = missing
			.map((m) => `  ${m.file}:${m.line}  ${m.key}`)
			.join("\n");
		expect(
			missing,
			missing.length
				? `${missing.length} translation key(s) referenced but absent from en.json.
i18next renders the key itself, so each of these is visible text in the UI:
${report}`
				: undefined,
		).toEqual([]);
	});

	it("has no stale entries in AWAITING_WORDING", () => {
		const stillMissing = new Set(findMissingKeys().map((f) => f.key));
		const fixed = [...AWAITING_WORDING].filter((key) => !stillMissing.has(key));
		expect(
			fixed,
			fixed.length
				? `These keys now exist. Remove them from AWAITING_WORDING: ${fixed.join(", ")}`
				: undefined,
		).toEqual([]);
	});

	it("the checker itself reports a key that is missing", () => {
		// A gate never observed failing is not a gate. This pins the mechanism:
		// comments are ignored, an inline default satisfies the check, and a bare
		// unknown key is reported.
		const source = stripComments(
			[
				`const a = t("ui.actions.save");`,
				`// const b = t("this.key.does.not.exist");`,
				`const c = t("also.missing", { defaultValue: "Also missing" });`,
			].join(`
`),
		);
		expect(source).not.toContain("this.key.does.not.exist");
		expect(hasInlineDefault(`"also.missing", { defaultValue: "x" }`)).toBe(true);
		expect(hasInlineDefault(`"a.key", { count: 2 }`)).toBe(false);
		expect(resolves("ui.actions.save")).toBe(true);
		expect(resolves("definitely.not.a.key")).toBe(false);
	});
});