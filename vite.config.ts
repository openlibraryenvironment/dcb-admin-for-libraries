import { defineConfig, loadEnv } from "vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
	// Ian: this is done to allow us to deploy the app to a folder rather than the root of a URI.
	// This approach shold also work for deployment at root.
	// const env = loadEnv(mode, process.cwd(), '');
	const bp = "./";

	return {
		plugins: [
			tanstackRouter({
				target: "react",
				autoCodeSplitting: true,
			}),
			react(),
		],
		base: bp,
		build: {
			// think about other ways of addressing bundle size
			// ultimately if we can't because of the DGrid it's fine
			rollupOptions: {
				// external: ["redux"],
				output: {
					manualChunks: {
						vendor: ["react", "react-dom"],
						router: ["@tanstack/react-router", "@tanstack/react-query"],
						mui: ["@mui/material", "@emotion/styled", "@emotion/react"],
					},
				},
			},
			optimizeDeps: {
				// Pre-bundle common dependencies
				include: [
					"react",
					"react-dom",
					"@mui/material",
					"@emotion/styled",
					"@emotion/react",
				],
			},
		},
		resolve: {
			alias: {
				"@components": path.resolve(__dirname, "src/components"),
				"@constants": path.resolve(__dirname, "src/constants"),
				"@forms": path.resolve(__dirname, "src/forms"),
				"@helpers": path.resolve(__dirname, "src/helpers"),
				"@queries": path.resolve(__dirname, "src/queries"),
				"@models": path.resolve(__dirname, "src/models"),
				"@mutations": path.resolve(__dirname, "src/mutations"),
				"@types": path.resolve(__dirname, "src/types"),
				"@": path.resolve(__dirname, "src"),
			},
		},
	};
});
