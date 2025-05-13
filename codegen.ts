import type { CodegenConfig } from "@graphql-codegen/cli";

const DCB_API_BASE_GRAPHQL = import.meta.env.VITE_DCB_API_BASE + "/graphql";

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
