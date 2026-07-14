import { defineConfig, loadEnv } from "vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import path from "path";
/// <reference types="vitest/config" />

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), "");

	return {
		plugins: [
			tanstackRouter({
				target: "react",
				autoCodeSplitting: true,
			}),
			react(),
		],
		server: {
			historyApiFallback: true,
		},
		// Deliberately an absolute path, NOT a relative "./" base. A relative base
		// resolves asset URLs against the CURRENT page path, and every SPA-fallback
		// host serves index.html AT the deep URL rather than at "/" - so refreshing
		// /dcb-admin-for-libraries/patronRequests/<id> would resolve
		// ./assets/index-<hash>.js against /dcb-admin-for-libraries/patronRequests/
		// and 404 every asset.
		//
		// This is also the single source of the router basepath: main.tsx reads it
		// back as import.meta.env.BASE_URL. It must never be re-supplied at runtime.
		base: env.VITE_PUBLIC_URL || "/",
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
		},

		// Top-level, not nested under `build` - where it was never read.
		optimizeDeps: {
			include: [
				"react",
				"react-dom",
				"@mui/material",
				"@mui/x-data-grid-premium",
				"@emotion/styled",
				"@emotion/react",
			],
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
