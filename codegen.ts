import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
	schema: import.meta.env.VITE_DCB_API_BASE,
	documents: ["src/**/*.tsx"],
	generates: {
		"./src/gql/": {
			preset: "client",
		},
	},
};
export default config;
