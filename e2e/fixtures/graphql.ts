import type { Page, Route } from "@playwright/test";

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
	await page.route(`**/graphql`, async (route) => {
		const name = operationName(route);
		const responder = name ? mocks[name] : undefined;

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
