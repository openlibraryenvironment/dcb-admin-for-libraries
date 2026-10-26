import { describe, expect, it, afterEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { buildSchema, parse, validate, type GraphQLSchema } from "graphql";

import {
	SERVICE_CAPABILITIES,
	meetsServiceVersion,
} from "@constants/serviceCapabilities";

/**
 * Every document this application can emit must be valid against the
 * dcb-service it will be sent to, in each flag state a deployment can be in:
 * a field gated at the wrong threshold, or kept behind a flag's off branch, is
 * invisible to all-on and all-off alike. docs/service-compatibility.md.
 */

const repoRoot = process.cwd();

const schemaFrom = (file: string): GraphQLSchema =>
	buildSchema(readFileSync(path.resolve(repoRoot, file), "utf8"));

const CURRENT = schemaFrom("schema.graphqls");
const LEGACY = schemaFrom("schema.v8.71.0.graphqls");

const flagsFor = (capabilities: readonly { flag: string }[]) =>
	Object.fromEntries(capabilities.map((entry) => [entry.flag, "true"]));

/** Every flag the registry knows, all on. */
const ALL_FLAGS_ON = flagsFor(SERVICE_CAPABILITIES);

/**
 * The flags a deployment on each RELEASE would have: every capability that release
 * actually serves, and none that landed after it.
 *
 * `meetsServiceVersion(version, null)` is false, so a capability with no release - which
 * is what `since: null` means - is off here. That is the claim under test.
 */
const RELEASE_PASSES = (["9.0.0", "9.1.0", "9.2.0"] as const).map((version) => {
	const capabilities = SERVICE_CAPABILITIES.filter(
		(entry) => meetsServiceVersion(version, entry.since) === true,
	);
	return {
		version,
		schema: schemaFrom(`schema.v${version}.graphqls`),
		capabilities,
		flags: flagsFor(capabilities),
	};
});

const modules = import.meta.glob("../{queries,mutations}/*.ts");

/**
 * Documents that are only ever sent when a flag is on, with the flag that sends them.
 *
 * EXCLUDED from the narrower passes, not skipped, and the flag is named so the exclusion
 * is a reviewable claim rather than a hole: docs/testing.md, "Documents only sent behind a
 * flag".
 */
const FLAG_ONLY: Record<string, string> = {
	"queries/getAnnouncements.ts": "VITE_FEATURE_ANNOUNCEMENTS",
	"mutations/announcements.ts": "VITE_FEATURE_ANNOUNCEMENTS",
	"queries/getPatronRequestTags.ts": "VITE_FEATURE_REQUEST_TAGS",
	"mutations/requestTags.ts": "VITE_FEATURE_REQUEST_TAGS",
	"queries/getPatronRequestNotes.ts": "VITE_FEATURE_REQUEST_NOTES",
	"mutations/requestNotes.ts": "VITE_FEATURE_REQUEST_NOTES",
};

const gatedBy = (file: string): string | undefined => {
	const name = file.replace(/^\.\.\//, "").replace(/^\.\//, "queries/");
	return FLAG_ONLY[name];
};

/**
 * Every document a module exports.
 *
 * Two shapes: a plain `gql` string, and - for anything whose selection depends on the
 * deployment's dcb-service - a zero-argument builder that reads the flags when it is
 * called. Both are collected, so converting a constant into a builder cannot quietly drop
 * it out of this gate.
 */
const documentsFrom = (mod: Record<string, unknown>): string[] =>
	Object.values(mod).flatMap((value) => {
		if (typeof value === "string") return [value];
		if (typeof value === "function" && value.length === 0) {
			const built = (value as () => unknown)();
			return typeof built === "string" ? [built] : [];
		}
		return [];
	});

const assertValid = (document: string, schema: GraphQLSchema, where: string) => {
	const errors = validate(schema, parse(document));

	expect(errors.map((error) => error.message), `${where}\n${document}`).toEqual(
		[],
	);
};

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("documents validate against the dcb-service they target", () => {
	const files = Object.keys(modules)
		.filter((file) => !file.endsWith(".test.ts"))
		.sort();

	it("finds the documents", () => {
		// Guards the guard. A refactor that moved src/queries would otherwise leave a
		// suite that passes because it tests nothing at all.
		expect(files.length).toBeGreaterThan(20);
	});

	it.each(files)(
		"%s is valid against the target schema (all flags on)",
		async (file) => {
			vi.stubGlobal("window", { __APP_ENV__: ALL_FLAGS_ON });

			const documents = documentsFrom(
				(await modules[file]()) as Record<string, unknown>,
			);
			expect(documents.length).toBeGreaterThan(0);
			documents.forEach((document) =>
				assertValid(document, CURRENT, `${file} against schema.graphqls`),
			);
		},
	);

	describe.each(RELEASE_PASSES)("dcb-service $version", ({ version, schema, flags }) => {
		it.each(
			files.filter((file) => {
				const gate = gatedBy(file);
				return !gate || gate in flags;
			}),
		)(`%s is valid against dcb-service ${version} (the release's flags)`, async (file) => {
			vi.stubGlobal("window", { __APP_ENV__: flags });

			const documents = documentsFrom(
				(await modules[file]()) as Record<string, unknown>,
			);
			expect(documents.length).toBeGreaterThan(0);
			documents.forEach((document) =>
				assertValid(document, schema, `${file} against schema.v${version}.graphqls`),
			);
		});
	});

	// A host on the newest release can run with fewer flags than it serves, while the worker's
	// table lags the release: every document must still be valid with any one of them off
	const NEWEST = RELEASE_PASSES[RELEASE_PASSES.length - 1];
	const LAGGING = [
		{ missing: "every flag", flags: {} as Record<string, string> },
		...NEWEST.capabilities.map(({ flag }) => ({
			missing: flag,
			flags: Object.fromEntries(Object.entries(NEWEST.flags).filter(([name]) => name !== flag)),
		})),
	];

	describe.each(LAGGING)(`dcb-service ${NEWEST.version} without $missing`, ({ flags }) => {
		it.each(
			files.filter((file) => {
				const gate = gatedBy(file);
				return !gate || gate in flags;
			}),
		)(`%s is valid against dcb-service ${NEWEST.version}`, async (file) => {
			vi.stubGlobal("window", { __APP_ENV__: flags });

			const documents = documentsFrom(
				(await modules[file]()) as Record<string, unknown>,
			);
			documents.forEach((document) =>
				assertValid(document, NEWEST.schema, `${file} against schema.v${NEWEST.version}.graphqls`),
			);
		});
	});

	// The flags no release decides - which Home panels, whether a discovery UI is live - are a
	// deployment's choice on 8.71.0 too
	const PRODUCT_FLAGS = Object.fromEntries(
		[...readFileSync(path.resolve(repoRoot, "src/helpers/featureFlags.ts"), "utf8").matchAll(/readFlag\("([A-Z_]+)"\)/g)]
			.map((match) => match[1])
			.filter((flag) => !SERVICE_CAPABILITIES.some((entry) => entry.flag === flag))
			.map((flag) => [flag, "true"]),
	);

	it("finds the product-choice flags", () => {
		expect(Object.keys(PRODUCT_FLAGS)).toContain("VITE_FEATURE_HOME_INSIGHTS");
		expect(Object.keys(PRODUCT_FLAGS)).not.toContain("VITE_FEATURE_INSIGHTS");
	});

	it.each(files.filter((file) => !gatedBy(file)))(
		"%s is valid against dcb-service 8.71.0 with every product-choice flag on",
		async (file) => {
			vi.stubGlobal("window", { __APP_ENV__: PRODUCT_FLAGS });

			const documents = documentsFrom(
				(await modules[file]()) as Record<string, unknown>,
			);
			documents.forEach((document) =>
				assertValid(document, LEGACY, `${file} against schema.v8.71.0.graphqls`),
			);
		},
	);

	it("every flag-only exclusion names a flag that exists", () => {
		const declared = readFileSync(
			path.resolve(repoRoot, "src/helpers/featureFlags.ts"),
			"utf8",
		);

		for (const [file, flag] of Object.entries(FLAG_ONLY)) {
			expect(declared, `${file} is excluded on ${flag}`).toContain(
				`readFlag("${flag}")`,
			);
		}
	});

	it("the 9.0.0 pass is not vacuous", () => {
		// It would be if every capability were `since: null`, or if meetsServiceVersion
		// started returning null for a release we hold a schema for.
		const release9 = RELEASE_PASSES[0].capabilities;
		expect(release9.length).toBeGreaterThan(0);
		expect(release9.length).toBeLessThan(
			SERVICE_CAPABILITIES.length,
		);
	});

	it.each(files.filter((file) => !gatedBy(file)))(
		"%s is valid against dcb-service 8.71.0 (all flags off)",
		async (file) => {
			// No window at all: envsubst renders an unset flag as the empty string and a
			// bundle built without one leaves it undefined. readFlag reads both as false,
			// which is the state of an environment that has never heard of the flag.
			vi.stubGlobal("window", undefined);

			const documents = documentsFrom(
				(await modules[file]()) as Record<string, unknown>,
			);
			expect(documents.length).toBeGreaterThan(0);
			documents.forEach((document) =>
				assertValid(
					document,
					LEGACY,
					`${file} against schema.v8.71.0.graphqls`,
				),
			);
		},
	);
});
