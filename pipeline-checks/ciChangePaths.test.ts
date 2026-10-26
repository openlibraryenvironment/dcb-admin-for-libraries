import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Files that cannot change what the browser gates test, so a merge request touching only
 * these skips them. Adding a pattern here is a claim about the app: review it as one.
 */
const NOT_APP = ["docs/**/*", "antora/**/*", "**/*.md", "tests/**/*", "pipeline-checks/**/*", "LICENSE", ".vscode/**/*"];

/** The `&app_paths` list in .gitlab-ci.yml: what a merge request must touch to run the gates. */
const appPaths = (() => {
	const lines = readFileSync(".gitlab-ci.yml", "utf8").split("\n");
	const start = lines.findIndex((line) => line.includes("paths: &app_paths"));
	const paths: string[] = [];
	for (const line of lines.slice(start + 1)) {
		const item = /^\s+- "?([^"]+)"?\s*$/.exec(line);
		if (!item) break;
		paths.push(item[1]);
	}
	return paths;
})();

/** GitLab's `changes` matching: Ruby fnmatch with FNM_PATHNAME, FNM_DOTMATCH and FNM_EXTGLOB. */
function matcher(glob: string): RegExp {
	let pattern = "";
	for (let i = 0; i < glob.length; i++) {
		const character = glob[i];
		if (glob.startsWith("**/", i)) {
			pattern += "(?:.*/)?";
			i += 2;
		} else if (character === "*") pattern += "[^/]*";
		else if (character === "?") pattern += "[^/]";
		else if (character === "{") pattern += "(?:";
		else if (character === "}") pattern += ")";
		else if (character === ",") pattern += "|";
		else pattern += character.replace(/[.+^$()|[\]\\]/g, "\\$&");
	}
	return new RegExp(`^${pattern}$`);
}

const matchesAny = (globs: string[]) => {
	const patterns = globs.map(matcher);
	return (file: string) => patterns.some((pattern) => pattern.test(file));
};

describe("the paths that run the browser gates on a merge request", () => {
	const files = execFileSync("git", ["ls-files"], { encoding: "utf8" }).split("\n").filter(Boolean);
	const isApp = matchesAny(appPaths);
	const isNotApp = matchesAny(NOT_APP);

	it("reads the list from .gitlab-ci.yml", () => {
		expect(appPaths).toContain("src/**/*");
		expect(files.length).toBeGreaterThan(100);
	});

	it("account for every tracked file, one way or the other", () => {
		expect(files.filter((file) => !isApp(file) && !isNotApp(file))).toEqual([]);
	});

	it("leave out documentation, so a docs-only merge request skips the gates", () => {
		for (const file of ["docs/testing.md", "README.md", "docs/DCB_Admin_for_Libraries_VPAT.md"]) {
			expect(isApp(file), file).toBe(false);
		}
	});

	it("take in what the app is built and tested from", () => {
		for (const file of ["src/main.tsx", "e2e-base-path/fixtures.ts", ".gitlab-ci.yml", "package-lock.json", "vite.config.ts", ".npmrc"]) {
			expect(isApp(file), file).toBe(true);
		}
	});
});
