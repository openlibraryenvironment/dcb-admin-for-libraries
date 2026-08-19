import { test as base, expect } from "@playwright/test";
import { injectRuntimeConfig } from "./runtime-config";
import { seedAuth, type FakeUserOptions } from "./auth";
import { mockGraphQL, type OperationMocks } from "./graphql";
import { useColorScheme, type ColorScheme } from "./color-scheme";
import { analyse, formatViolations } from "./axe";

/**
 * The app harness. Every spec imports `test` and `expect` from here rather than
 * from @playwright/test, so that:
 *
 *  - runtime config is always injected (no spec can accidentally hit a real
 *    host, and none has to remember the boilerplate);
 *  - signing in, mocking GraphQL and choosing a colour scheme are one call each,
 *    in the order the app requires (all of them install init scripts, so they
 *    must run before the first navigation);
 *  - the accessibility assertion is the same assertion everywhere, which is
 *    what makes it a gate rather than a habit.
 *
 * Adding a new spec should mean writing assertions, not wiring.
 */
export interface AppFixture {
	/** Seed an authenticated session. Call before goto. */
	signIn(options?: FakeUserOptions): Promise<void>;
	/** Mock GraphQL operations by operationName. Call before goto. */
	mockGraphQL(mocks: OperationMocks): Promise<void>;
	/** Boot the app in a given colour scheme. Call before goto. */
	useColorScheme(scheme: ColorScheme): Promise<void>;
	/** Assert zero WCAG 2.2 AA violations on the current page. */
	expectNoAccessibilityViolations(): Promise<void>;
}

export const test = base.extend<{ app: AppFixture; runtimeConfig: void }>({
	// auto: no spec should have to remember this, and one that forgets would
	// silently exercise a different code path (the inject_env.json fetch).
	runtimeConfig: [
		async ({ page }, use) => {
			await injectRuntimeConfig(page);
			await use();
		},
		{ auto: true },
	],

	app: async ({ page }, use) => {
		await use({
			signIn: (options) => seedAuth(page, options),
			mockGraphQL: (mocks) => mockGraphQL(page, mocks),
			useColorScheme: (scheme) => useColorScheme(page, scheme),
			expectNoAccessibilityViolations: async () => {
				const violations = await analyse(page);
				expect(
					violations,
					violations.length
						? `axe found ${violations.length} WCAG 2.2 AA violation(s):\n\n${formatViolations(violations)}`
						: undefined,
				).toEqual([]);
			},
		});
	},
});

export { expect };
