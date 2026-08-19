import { describe, it, expect, vi, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

import { isInsightsEnabled } from "@helpers/featureFlags";

// A flag is only useful if the environment can actually set it. featureFlags.ts reads
// from window.__APP_ENV__, which 40-inject-env.sh renders at container start from
// inject_env.json.template - so a flag absent from that template is undefined in every
// deployed environment and the feature it gates can never be switched on. That is not
// hypothetical: this is exactly how VITE_FEATURE_INSIGHTS shipped in dcb-admin-ui.

const repoFile = (relative: string) =>
	// vitest runs with the package root as cwd, which is where both docker/ and src/ live.
	readFileSync(path.resolve(process.cwd(), relative), "utf8");

const declaredFlags = (): string[] => {
	const source = repoFile("src/helpers/featureFlags.ts");
	const names = [...source.matchAll(/readFlag\(\s*"([A-Z0-9_]+)"\s*\)/g)].map(
		(m) => m[1],
	);

	// Guard the guard: a refactor that renames readFlag would otherwise make this
	// whole suite vacuously pass.
	expect(names.length).toBeGreaterThan(0);
	return names;
};

describe("runtime feature flags are wired through to deployment", () => {
	const template = repoFile("docker/production/inject_env.json.template");

	it.each(declaredFlags())("%s is rendered into inject_env.json", (flag) => {
		expect(JSON.parse(template)).toHaveProperty(flag, `\${${flag}}`);
	});
});

describe("flags fail closed", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("is off when the environment has never heard of the flag", () => {
		// envsubst renders an unset variable as the empty string, and a bundle built
		// without the var leaves it undefined - neither may read as enabled.
		for (const value of [undefined, "", "false", "FALSE", "0", "yes"]) {
			vi.stubGlobal("window", {
				__APP_ENV__: { VITE_FEATURE_INSIGHTS: value },
			});
			expect(isInsightsEnabled()).toBe(false);
		}
	});

	it("is on only for an explicit true", () => {
		vi.stubGlobal("window", {
			__APP_ENV__: { VITE_FEATURE_INSIGHTS: "true" },
		});
		expect(isInsightsEnabled()).toBe(true);
	});
});
