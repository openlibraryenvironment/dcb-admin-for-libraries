import { defineConfig } from "vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import path from "path";
/// <reference types="vitest/config" />

// https://vite.dev/config/
export default defineConfig(() => {
	return {
		plugins: [
			tanstackRouter({
				target: "react",
				autoCodeSplitting: true,
			}),
			react(),
		],
		server: {
			historyApiFallback: true, // For Vercel 404 weirdness. We won't end up deploying to Vercel permanently so not to worry too much.
		},
		base: "./",
		build: {
			// think about other ways of addressing bundle size
			// ultimately if we can't because of the DGrid it's fine
			rollupOptions: {
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
					"@mui/x-data-grid-premium",
					"@emotion/styled",
					"@emotion/react",
				],
			},
		},

		test: {
			include: ["**/*.test.ts"],
			exclude: ["node_modules", "dist", "coverage", "playwright", "**/*.d.ts"],
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
