import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(import.meta.dirname, "..", "src");
const ROUTES = join(SRC, "routes");

const sourceFiles = (dir: string): string[] =>
	readdirSync(dir).flatMap((name) => {
		const path = join(dir, name);
		if (statSync(path).isDirectory()) return sourceFiles(path);
		return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
	});

/** "/__authenticated/patronRequests/$id/" is routes/__authenticated/patronRequests/$id/index.tsx. */
const routeFileFor = (routeId: string): string =>
	join(ROUTES, routeId.endsWith("/") ? `${routeId}index.tsx` : `${routeId}.tsx`);

const GRID_HOOK = /\buseSyncedDataGrid\(/;

/**
 * Grid state is URL state, and a URL is typed by hand, bookmarked and kept for
 * months. A grid whose route has no validateSearch hands that text to the
 * grid and the server unchecked.
 */
describe("every route with a URL-backed grid", () => {
	const users = sourceFiles(SRC).filter(
		(path) =>
			!path.endsWith(join("hooks", "useSyncedDataGrid.ts")) &&
			GRID_HOOK.test(readFileSync(path, "utf8")),
	);

	it("is found, so this test is not passing vacuously", () => {
		expect(users.length).toBeGreaterThanOrEqual(7);
	});

	it.each(users.map((path) => [relative(SRC, path), path]))(
		"%s validates its search",
		(_, path) => {
			const source = readFileSync(path, "utf8");
			const routeIds = [
				...source.matchAll(/(?:createFileRoute|getRouteApi)\(\s*"([^"]+)"/g),
			].map((match) => match[1]);

			expect(routeIds, "names the route whose search it reads").not.toEqual(
				[],
			);
			for (const routeId of routeIds) {
				expect(
					readFileSync(routeFileFor(routeId), "utf8"),
					`${routeId} declares validateSearch`,
				).toMatch(/\bvalidateSearch\s*:/);
			}
		},
	);
});
