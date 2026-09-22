import js from "@eslint/js";
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
			// eslint:recommended. The TypeScript sets below are additive to it, not a
			// replacement, and nothing extended it - so no plain-JavaScript correctness
			// rule was running at all.
			js.configs.recommended,
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
				// Mobius serves this app at /dcb-admin-for-libraries/ beside dcb-admin on one
				// origin, and only the router adds the base: a root-relative href or a bare
				// window.open leaves the app.
				{
					selector:
						"JSXAttribute[name.name='href'] > Literal[value=/^\\/(?!\\/)/]",
					message:
						"A root-relative href leaves the app's base path. Navigate with `to` on a router link (CustomLink, or `component={Link} to=…`).",
				},
				{
					selector:
						"JSXAttribute[name.name='href'] > JSXExpressionContainer > TemplateLiteral[quasis.0.value.raw=/^\\/(?!\\/)/]",
					message:
						"A root-relative href leaves the app's base path. Navigate with `to` on a router link (CustomLink, or `component={Link} to=…`).",
				},
				{
					selector:
						"CallExpression[callee.object.name='window'][callee.property.name='open']:not([arguments.0.callee.name='appUrl']):not([arguments.0.value=/^https?:/])",
					message:
						"window.open resolves a path against the origin root, outside the deployment base. Pass appUrl(path).",
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
			// exhaustive-deps is an ERROR here: a missing dependency froze editingEnabled
			// in the mappings grid and left permitted libraries unable to edit. The rest of
			// react-hooks v7 - the React Compiler family - reports 14 findings that cannot
			// be fixed without changing the form architecture, so it stays off until it can
			// be left green. docs/testing.md.
			"react-hooks/rules-of-hooks": "error",
			"react-hooks/exhaustive-deps": "error",
		},
	},
	{
		// Build tooling that runs in Node and whose job is to print a report.
		//
		// The console restrictions above exist to keep a barcode or a token out of
		// a BROWSER console; these never run in a browser, and a budget check that
		// cannot name the chunk it is failing on is useless. Node globals are
		// declared for the same reason the .cjs block below declares `module`.
		files: ["scripts/**/*.{mjs,js}"],
		languageOptions: {
			globals: {
				console: "readonly",
				process: "readonly",
				URL: "readonly",
			},
		},
		rules: {
			"no-console": "off",
			"no-restricted-syntax": "off",
		},
	},
	{
		// CommonJS tooling config, not application source. eslint:recommended brings
		// no-undef, which has no way to know `module` exists here - and the file has to
		// stay .cjs because the package is "type": "module". Declared inline rather than
		// pulling in the `globals` package for two identifiers.
		files: ["**/*.cjs"],
		languageOptions: {
			globals: {
				module: "writable",
				require: "readonly",
				__dirname: "readonly",
				process: "readonly",
			},
		},
		// lighthouserc.cjs is CommonJS BECAUSE this package is "type": "module" -
		// lhci require()s its config, so an ESM one throws. require() is the point.
		rules: { "@typescript-eslint/no-require-imports": "off" },
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
