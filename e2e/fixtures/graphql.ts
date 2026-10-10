import type { Page, Route } from "@playwright/test";
import library from "../fixtures-data/library.json" with { type: "json" };
import { API_BASE } from "./runtime-config";

/**
 * Every GraphQL call in this app goes through graphql-request to
 * `${VITE_DCB_API_BASE}/graphql` as a POST carrying
 * {query, variables, operationName}. Mocks dispatch on operationName, which is
 * the name in the gql template (LoadMappings, LoadLibrary, ...) - NOT the
 * exported constant's name. Getting that wrong produces a handler that never
 * matches and a page that never renders, which is exactly what the previous
 * mappings mocks did.
 */
export type GraphQLResponder =
	| Record<string, unknown>
	| ((variables: Record<string, unknown>) => Record<string, unknown>);

export type OperationMocks = Record<string, GraphQLResponder>;

/**
 * The header's library name renders on every authenticated page, so it is
 * mocked by default rather than in every spec. A spec's own mock overrides it.
 */
const DEFAULT_MOCKS: OperationMocks = {
	LoadLibraryNames: {
		libraries: {
			content: library.libraries.content.map(({ id, fullName, agencyCode }) => ({
				id,
				fullName,
				agencyCode,
			})),
		},
	},
};

function operationName(route: Route): string | undefined {
	return route.request().postDataJSON()?.operationName;
}

/**
 * Registers one handler for all GraphQL traffic. An operation with no mock is
 * aborted rather than continued: the API host does not resolve, so continuing
 * means a 30s DNS wait per call. Aborting fails the query immediately and the
 * spec shows an error state instead of a timeout.
 */
export async function mockGraphQL(
	page: Page,
	mocks: OperationMocks,
): Promise<void> {
	const all = { ...DEFAULT_MOCKS, ...mocks };
	// The configured API base exactly, not **/graphql: the loose pattern also answered
	// a page posting to "undefined/graphql" on the preview's own origin.
	await page.route(`${API_BASE}/graphql`, async (route) => {
		const name = operationName(route);
		const responder = name ? all[name] : undefined;

		if (!responder) {
			await route.abort("failed");
			return;
		}

		const variables = route.request().postDataJSON()?.variables ?? {};
		const data =
			typeof responder === "function" ? responder(variables) : responder;

		await route.fulfill({ json: { data } });
	});
}
