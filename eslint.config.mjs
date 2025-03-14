import tseslint from "typescript-eslint";
import jsxA11y from "eslint-plugin-jsx-a11y";
import pluginRouter from "@tanstack/eslint-plugin-router";
import pluginQuery from "@tanstack/eslint-plugin-query";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
	...pluginRouter.configs["flat/recommended"],
	...tseslint.configs.recommended,
	...tseslint.configs.stylistic,
	...pluginQuery.configs["flat/recommended"],

	// ...jsxA11y.flatConfigs.recommended,
	{
		plugins: {
			"jsx-a11y": jsxA11y,
		},
		rules: {
			...jsxA11y.configs.recommended.rules,
		},
	},
	globalIgnores(["dist/", "node_modules/", "public/", "eslint.config.mjs"]),

	{
		rules: {
			"@typescript-eslint/no-explicit-any": "off",
			"@typescript-eslint/ban-ts-comment": [
				"error",
				{ "ts-ignore": "allow-with-description" },
			],
			"no-duplicate-imports": "error",
			"no-self-compare": "error",
			"no-constant-binary-expression": "error",
			"no-restricted-syntax": [
				"warn",
				{
					selector:
						"JSXElement[openingElement.name.name='a'] > JSXElement[openingElement.name.name=/^(a|button|Link)$/]",
					message:
						"Invalid DOM Nesting: anchor elements cannot have anchor elements, button elements or Link components as children",
				},
				{
					selector:
						"JSXElement[openingElement.name.name='button'] > JSXElement[openingElement.name.name=/^(a|button|Link)$/]",
					message:
						"Invalid DOM Nesting: button elements cannot have anchor elements, button elements or Link components as children",
				},
				{
					selector:
						"JSXElement[openingElement.name.name='Link'] > JSXElement[openingElement.name.name=/^(a|button|Link)$/]",
					message:
						"Invalid DOM Nesting: Link components cannot have anchor elements, button elements or Link components as children",
				},
				{
					selector:
						"JSXElement[openingElement.name.name=/^(ol|ul)$/] > JSXElement[openingElement.name.name!='li'][openingElement.name.name!=/^[A-Z]/]",
					message:
						"Invalid DOM Nesting: ol and ul elements cannot have non-li elements as children",
				},
				{
					selector:
						"JSXElement[openingElement.name.name='p'] > JSXElement[openingElement.name.name=/^(div|h1|h2|h3|h4|h5|h6|hr|ol|p|table|ul)$/]",
					message:
						"Invalid DOM Nesting: p elements cannot have div, h1, h2, h3, h4, h5, h6, hr, ol, p, table or ul elements as children",
				},
				{
					selector:
						"JSXElement[openingElement.name.name='table'] > JSXElement[openingElement.name.name!=/^(caption|colgroup|tbody|tfoot|thead)$/][openingElement.name.name!=/^[A-Z]/]",
					message:
						"Invalid DOM Nesting: table elements cannot have elements which are not caption, colgroup, tbody, tfoot, or thead elements as children",
				},
				{
					selector:
						"JSXElement[openingElement.name.name=/(tbody|thead|tfoot)/] > JSXElement[openingElement.name.name!='tr'][openingElement.name.name!=/^[A-Z]/]",
					message:
						"Invalid DOM Nesting: tbody, thead, and tfoot elements cannot have non-tr elements as children",
				},
				{
					selector:
						"JSXElement[openingElement.name.name='tr'] > JSXElement[openingElement.name.name!=/(th|td)/][openingElement.name.name!=/^[A-Z]/]",
					message:
						"Invalid DOM Nesting: tr elements cannot have elements which are not th or td elements as children",
				},
			],
		},
	},
]);
