import { defineConfig, loadEnv, type Plugin } from "vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import path from "path";
/// <reference types="vitest/config" />

function kiBootstrapCssPlugin(): Plugin {
	return {
		name: "ki-bootstrap-css",
		enforce: "post",
		generateBundle(_options, bundle) {
			const cssFiles = Object.values(bundle)
				.filter(
					(output) =>
						output.type === "asset" && output.fileName.endsWith(".css"),
				)
				.map((output) => output.fileName);

			const adapterEntry = Object.values(bundle).find(
				(output) =>
					output.type === "chunk" &&
					output.isEntry &&
					output.facadeModuleId?.endsWith("/src/ki-bootstrap.ts"),
			);

			if (adapterEntry?.type !== "chunk" || cssFiles.length === 0) {
				return;
			}

			adapterEntry.code = `
const __kiStyles = ${JSON.stringify(cssFiles)};
if (typeof document !== "undefined") {
	for (const __kiStyle of __kiStyles) {
		const __kiHref = new URL("./" + __kiStyle, import.meta.url).href;
		const __kiLoaded = Array.from(document.styleSheets).some(
			(__kiSheet) => __kiSheet.href === __kiHref,
		);
		if (!__kiLoaded) {
			const __kiLink = document.createElement("link");
			__kiLink.rel = "stylesheet";
			__kiLink.href = __kiHref;
			__kiLink.dataset.kiStylesheet = __kiHref;
			document.head.appendChild(__kiLink);
		}
	}
}
${adapterEntry.code}`;
		},
	};
}

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
			kiBootstrapCssPlugin(),
		],
		// No `server.historyApiFallback` here: that is a webpack-dev-server option
		// and Vite has never had it, so it was dead config that read like the thing
		// keeping deep links alive. Vite's SPA fallback comes from the default
		// `appType: "spa"`, and it is base-aware - GET /dcb-admin-for-libraries-dev/
		// patronRequests/<id> serves index.html without it.
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
		experimental: {
			renderBuiltUrl(_filename, { hostType }) {
				return hostType === "html" ? undefined : { relative: true };
			},
		},
		build: {
			// think about other ways of addressing bundle size
			// ultimately if we can't because of the DGrid it's fine
			rollupOptions: {
				preserveEntrySignatures: "strict",
				input: {
					index: path.resolve(import.meta.dirname, "index.html"),
					"ki-bootstrap": path.resolve(import.meta.dirname, "src/ki-bootstrap.ts"),
				},
				output: {
					entryFileNames: (chunk) =>
						chunk.facadeModuleId?.endsWith("/src/ki-bootstrap.ts")
							? "ki-bootstrap.js"
							: "assets/[name]-[hash].js",
					chunkFileNames: "assets/[name]-[hash].js",
					assetFileNames: "assets/[name]-[hash][extname]",
					// manualChunks removed with the Vite 8 upgrade. Vite 8 bundles with
					// rolldown, which takes a function or its own `advancedChunks` groups
					// and rejects the object form outright ("manualChunks is not a
					// function"). It was not earning its place regardless: on rollup it
					// emitted "Generated an empty chunk: vendor" on every build, because
					// react/react-dom were already reachable from the entry. dcb-admin-ui
					// carries no manual chunking either — rolldown's default splitting is
					// what both apps now use.
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
				"@components": path.resolve(import.meta.dirname, "src/components"),
				"@constants": path.resolve(import.meta.dirname, "src/constants"),
				"@forms": path.resolve(import.meta.dirname, "src/forms"),
				"@helpers": path.resolve(import.meta.dirname, "src/helpers"),
				"@queries": path.resolve(import.meta.dirname, "src/queries"),
				"@models": path.resolve(import.meta.dirname, "src/models"),
				"@mutations": path.resolve(import.meta.dirname, "src/mutations"),
				"@types": path.resolve(import.meta.dirname, "src/types"),
				"@": path.resolve(import.meta.dirname, "src"),
			},
		},
	};
});
