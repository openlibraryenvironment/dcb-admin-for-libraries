import { describe, expect, it, afterEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { buildSchema, parse, validate, type GraphQLSchema } from "graphql";

import { SERVICE_CAPABILITIES } from "@constants/serviceCapabilities";

/**
 * Every document this application can emit must be valid against the dcb-service it will
 * be sent to — R-19.
 *
 * <h2>What this catches, and why prose could not</h2>
 *
 * A GraphQL field the server has never heard of is NOT a null. It is a validation error,
 * and it fails the whole operation. So one field selected a release too early does not
 * degrade a panel - `LoadLibrary` runs in the header on every page and in six routes, so
 * it takes the application down.
 *
 * A note in a CONTRIBUTING.md saying "remember to flag fields from an unreleased
 * dcb-service" prevents none of it. This does, on the NEXT one as well as this one, in
 * milliseconds and with no server.
 *
 * <h2>The two passes</h2>
 *
 * The same documents, twice, with the flags in the state each deployment would have:
 * every flag on against `schema.graphqls` (dcb-service main, whose schema is identical
 * to the v9.0.0 tag), every flag off against
 * `schema.v8.71.0.graphqls` (the release before 9.0.0, which this app still has to run
 * against). The flags change the documents themselves, which is why the flag state has to
 * be set before the document is BUILT and not merely before it is rendered.
 */

const repoRoot = process.cwd();

const schemaFrom = (file: string): GraphQLSchema =>
	buildSchema(readFileSync(path.resolve(repoRoot, file), "utf8"));

const CURRENT = schemaFrom("schema.graphqls");
const LEGACY = schemaFrom("schema.v8.71.0.graphqls");

/** Every flag the registry knows, all on. */
const ALL_FLAGS_ON = Object.fromEntries(
	SERVICE_CAPABILITIES.map((entry) => [entry.flag, "true"]),
);

const modules = import.meta.glob("../{queries,mutations}/*.ts");

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

	it.each(files)(
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
