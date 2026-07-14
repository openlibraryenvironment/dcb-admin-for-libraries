import tseslint from "typescript-eslint";
import jsxA11y from "eslint-plugin-jsx-a11y";
import pluginRouter from "@tanstack/eslint-plugin-router";
import pluginQuery from "@tanstack/eslint-plugin-query";
import { defineConfig, globalIgnores } from "eslint/config";
import reactRefresh from "eslint-plugin-react-refresh";

// export default defineConfig([
// 	{
// 		plugins: {
// 			pluginRouter: pluginRouter,
// 			tseslint: tseslint,
// 			pluginQuery: pluginQuery,
// 		},
// 		extends: pluginRouter.configs["flat/recommended"],
// 		pluginQuery.configs["flat/recommended"],
// 	},
// ]);

export default defineConfig(
	{
		plugins: {
			tseslint,
			pluginQuery,
			pluginRouter,
			jsxA11y,
		},
		extends: [
			tseslint.configs.recommended,
			tseslint.configs.stylistic,
			pluginQuery.configs["flat/recommended"],
			pluginRouter.configs["flat/recommended"],
			jsxA11y.flatConfigs.recommended,
			reactRefresh.configs.recommended,
		],
	},
	{
		rules: {
			"@typescript-eslint/no-explicit-any": "warn",
			"@typescript-eslint/ban-ts-comment": [
				"error",
				{ "ts-ignore": "allow-with-description" },
			],
			"no-duplicate-imports": "error",
			"no-self-compare": "error",
			"no-restricted-imports": "error",
			"no-constant-binary-expression": "error",
		},
	},
	// playwright-report/ and test-results/ are generated: the HTML reporter ships
	// its own minified bundles, and linting them produced ~2900 phantom errors
	// that had nothing to do with our source. Generated output is not source.
	globalIgnores([
		"dist/",
		"node_modules/",
		"public/",
		"coverage/",
		"playwright-report/",
		"test-results/",
		"eslint.config.mjs",
	])
);
