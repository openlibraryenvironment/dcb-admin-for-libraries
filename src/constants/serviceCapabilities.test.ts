import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { buildSchema, type GraphQLSchema } from "graphql";

import {
	SERVICE_CAPABILITIES,
	meetsServiceVersion,
	parseServiceVersion,
} from "@constants/serviceCapabilities";

/**
 * The registry has to be TRUE, not merely tidy — R-19.
 *
 * A row saying `since: "9.0.0"` is a claim about a dcb-service release. If it is wrong,
 * nothing else catches it: the flag would be switched on at the upgrade and the feature
 * would fail in an environment, which is the expensive place to find out. So the claim is
 * checked here against the schemas of the releases themselves, committed next to this
 * application.
 *
 * That is what makes the mechanism extendable rather than a one-off. To gate the next
 * feature - the local-holds work landing in a dcb-service after 9.0.0, say - you add a
 * row, commit that release's schema as `schema.v<version>.graphqls`, and these tests
 * either agree with you or fail.
 */

const repoRoot = process.cwd();

const schemaPath = (version: string) =>
	path.resolve(repoRoot, `schema.v${version}.graphqls`);

const schemaFor = (version: string): GraphQLSchema | null => {
	const file = schemaPath(version);
	return existsSync(file) ? buildSchema(readFileSync(file, "utf8")) : null;
};

/** The newest schema this app targets - dcb-service main. See the file's header. */
const CURRENT = buildSchema(
	readFileSync(path.resolve(repoRoot, "schema.graphqls"), "utf8"),
);

/**
 * Every release schema committed here, oldest first. The registry's `since` values must
 * name one of these - a threshold nobody can check is not a threshold.
 */
const SUPPORTED_RELEASES = ["8.71.0", "9.0.0"] as const;

/** Whether `schema` declares `field` on `type`, for object and input types alike. */
const declaresField = (
	schema: GraphQLSchema,
	type: string,
	field: string,
): boolean => {
	const named = schema.getType(type) as
		| { getFields?: () => Record<string, unknown> }
		| null
		| undefined;

	return Boolean(named?.getFields && field in named.getFields());
};

/** The newest release strictly older than `version`, or null if none is committed. */
const releaseBefore = (version: string): string | null => {
	const older = SUPPORTED_RELEASES.filter(
		(candidate) => meetsServiceVersion(version, candidate) && candidate !== version,
	);
	return older.length ? older[older.length - 1] : null;
};

describe("the release schemas this app is checked against", () => {
	it.each(SUPPORTED_RELEASES)("schema.v%s.graphqls is committed", (version) => {
		// Guards the guard: without the file, every assertion below skips silently and
		// the registry becomes unchecked prose again.
		expect(schemaFor(version), schemaPath(version)).not.toBeNull();
	});
});

describe("every capability names a release that really has its fields", () => {
	const versioned = SERVICE_CAPABILITIES.filter((entry) => entry.since !== null);

	it("there is something to check", () => {
		expect(versioned.length).toBeGreaterThan(0);
	});

	it.each(versioned)("$id: since is a release we hold a schema for", (entry) => {
		expect(parseServiceVersion(entry.since)).not.toBeNull();
		expect(SUPPORTED_RELEASES as readonly string[]).toContain(entry.since);
	});

	it.each(versioned)("$id: its fields exist in that release", (entry) => {
		const schema = schemaFor(entry.since!)!;

		for (const [type, fields] of Object.entries(entry.fields)) {
			for (const field of fields) {
				expect(
					declaresField(schema, type, field),
					`${type}.${field} is not in dcb-service ${entry.since}`,
				).toBe(true);
			}
		}
	});

	it.each(versioned)("$id: its fields are absent from the release before", (entry) => {
		// The half that catches a threshold set too LATE. Without it, a capability could
		// be gated behind a release newer than the one that actually serves it, and the
		// feature would stay hidden on deployments that could run it - a silent loss
		// rather than a failure.
		const previous = releaseBefore(entry.since!);
		if (previous === null) return;

		const schema = schemaFor(previous)!;

		for (const [type, fields] of Object.entries(entry.fields)) {
			for (const field of fields) {
				expect(
					declaresField(schema, type, field),
					`${type}.${field} already exists in dcb-service ${previous}, so ${entry.id} does not need ${entry.since}`,
				).toBe(false);
			}
		}
	});

	it.each(SERVICE_CAPABILITIES)("$id: its fields still exist on main", (entry) => {
		// A capability whose fields have been renamed again server-side would otherwise
		// stay switched on and fail against the newest deployment - the exact failure
		// this whole mechanism exists to prevent, in the other direction.
		for (const [type, fields] of Object.entries(entry.fields)) {
			for (const field of fields) {
				expect(
					declaresField(CURRENT, type, field),
					`${type}.${field} is no longer in the target schema`,
				).toBe(true);
			}
		}
	});

	it.each(SERVICE_CAPABILITIES)("$id: any fallback exists before $since", (entry) => {
		// A fallback is only meaningful if the older release actually has it.
		if (!entry.fallback || entry.since === null) return;

		const previous = releaseBefore(entry.since);
		if (previous === null) return;

		const schema = schemaFor(previous)!;

		for (const [type, fields] of Object.entries(entry.fallback)) {
			for (const field of fields) {
				expect(
					declaresField(schema, type, field),
					`fallback ${type}.${field} is not in dcb-service ${previous} either`,
				).toBe(true);
			}
		}
	});
});

describe("the registry and the flags agree", () => {
	const declared = readFileSync(
		path.resolve(repoRoot, "src/helpers/featureFlags.ts"),
		"utf8",
	);

	it.each(SERVICE_CAPABILITIES)("$id's flag is declared", (entry) => {
		// isCapabilityEnabled takes a name, so a typo here would otherwise be a flag
		// that is silently always off. Keeping every registry flag in featureFlags.ts
		// also keeps featureFlags.test.ts checking that it reaches a deployment.
		expect(declared).toContain(`readFlag("${entry.flag}")`);
	});

	it("no two capabilities share a flag or an id", () => {
		const ids = SERVICE_CAPABILITIES.map((entry) => entry.id);
		const flags = SERVICE_CAPABILITIES.map((entry) => entry.flag);

		expect(new Set(ids).size).toBe(ids.length);
		expect(new Set(flags).size).toBe(flags.length);
	});
});

describe("version comparison", () => {
	it("orders by component, not by string", () => {
		// "8.71.0" > "8.9.0" lexically, which is why this is not a string compare.
		expect(meetsServiceVersion("8.71.0", "9.0.0")).toBe(false);
		expect(meetsServiceVersion("8.71.0", "8.9.0")).toBe(true);
		expect(meetsServiceVersion("9.0.0", "9.0.0")).toBe(true);
	});

	it("reads a development build without pretending the suffix is a version", () => {
		expect(parseServiceVersion("9.1.0-SNAPSHOT")).toEqual([9, 1, 0]);
	});

	it("refuses to guess, and says so with null", () => {
		expect(parseServiceVersion("Unknown")).toBeNull();
		expect(meetsServiceVersion("Unknown", "9.0.0")).toBeNull();
	});

	it("is false for a capability no release serves", () => {
		expect(meetsServiceVersion("9.0.0", null)).toBe(false);
	});
});
