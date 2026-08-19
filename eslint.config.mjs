import tseslint from "typescript-eslint";
import jsxA11y from "eslint-plugin-jsx-a11y";
import pluginRouter from "@tanstack/eslint-plugin-router";
import pluginQuery from "@tanstack/eslint-plugin-query";
import { defineConfig, globalIgnores } from "eslint/config";
import reactRefresh from "eslint-plugin-react-refresh";
import i18next from "eslint-plugin-i18next";
import reactHooks from "eslint-plugin-react-hooks";

export default defineConfig(
	{
		extends: [
			tseslint.configs.recommended,
			tseslint.configs.stylistic,
			pluginQuery.configs["flat/recommended"],
			pluginRouter.configs["flat/recommended"],
			jsxA11y.flatConfigs.recommended,
			reactRefresh.configs.recommended,
			// Doctrine rule 11 - no hardcoded prose - as a gate rather than prose.
			i18next.configs["flat/recommended"],
		],
	},
	{
		rules: {
			// Off for the whole app rather than sprinkled: 151 sites currently trip
			// this rule, well past the point where per-site disables are readable.
			// Explicit `any` is still to be avoided; retyping those sites is its own
			// piece of work, not a rider on a dependency upgrade.
			"@typescript-eslint/no-explicit-any": "off",
			"@typescript-eslint/ban-ts-comment": [
				"error",
				{ "ts-ignore": "allow-with-description" },
			],
			"no-duplicate-imports": "error",
			"no-self-compare": "error",
			"no-restricted-imports": "error",
			"no-constant-binary-expression": "error",
			// Browser console output is collected nowhere, so it buys no
			// observability - but it demonstrably carried access tokens, patron
			// barcodes and contact details in this codebase. console.warn survives
			// for the one boot-time diagnostic that has no other symptom, and the
			// restrictions below keep every console call literal-only, so a message
			// can never carry a value.
			"no-console": ["error", { allow: ["warn"] }],
			"no-restricted-syntax": [
				"error",
				{
					selector:
						'CallExpression[callee.object.name="console"][arguments.length>1]',
					message:
						"A console call may take one literal message and nothing else. A second argument is how a patron barcode, a token or a whole row ends up in the console.",
				},
				{
					selector:
						'CallExpression[callee.object.name="console"]:not([arguments.0.type="Literal"])',
					message:
						"A console message must be a plain string literal. Interpolating a value is how PII reaches the console.",
				},
			],
		},
	},
	{
		// Scoped to src, because React hooks only exist there - and because
		// Playwright's fixture callbacks take a parameter conventionally named
		// `use`, which rules-of-hooks reads as React's use() hook and rejects.
		files: ["src/**/*.{ts,tsx}"],
		plugins: { "react-hooks": reactHooks },
		rules: {
			// exhaustive-deps as an error, not a warning: a missing dependency froze
			// editingEnabled in the mappings grid's column memo, leaving libraries
			// that ARE permitted to edit with a permanently disabled Edit action. It
			// took an e2e test to find; it should have taken a lint run.
			//
			// The rest of eslint-plugin-react-hooks v7 - its "recommended-latest" set
			// - is the React Compiler rule family (set-state-in-effect, purity, refs,
			// immutability, incompatible-library). It reports 14 further findings
			// here, three of them react-hook-form's watch() being flagged as
			// compiler-incompatible, which has no fix short of changing the form
			// architecture. A gate that can only be satisfied with suppressions is not
			// a gate, so that family stays off until it can be turned on and left
			// green.
			"react-hooks/rules-of-hooks": "error",
			"react-hooks/exhaustive-deps": "error",
		},
	},
	{
		// TanStack file-based routes necessarily pair the route component with a
		// `Route` export created via createFileRoute(); that is the framework's
		// design, not a Fast Refresh defect. The rule stays on everywhere else.
		files: ["src/routes/**/*.{ts,tsx}"],
		rules: {
			"react-refresh/only-export-components": "off",
		},
	},
	// playwright-report/ and test-results/ are generated: the HTML reporter ships
	// its own minified bundles, and linting them produced ~2900 phantom errors
	// that had nothing to do with our source. Generated output is not source -
	// which is also why routeTree.gen.ts, written by the TanStack router plugin
	// on every build, is not linted.
	globalIgnores([
		"dist/",
		"node_modules/",
		"public/",
		"coverage/",
		"playwright-report/",
		"test-results/",
		"eslint.config.mjs",
		"src/routeTree.gen.ts",
	])
);
