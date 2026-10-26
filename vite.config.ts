import { defineConfig, loadEnv, type Plugin } from "vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import path from "path";
/// <reference types="vitest/config" />

// Loaded only by features this app does not offer, so never by a browser. Excel export is
// offered, through the export wizard only. tests/excludedFromBuild.test.ts fails if either changes.
const EXCLUDED_PACKAGES = [
	// Chart image export: no chart renders a toolbar or calls exportAsImage.
	"rasterizehtml",
];

// The commit, not the version: the build job runs before semantic-release bumps package.json.
function buildStampPlugin(): Plugin {
	const build = process.env.CI_COMMIT_SHORT_SHA || "local";
	return {
		name: "build-stamp",
		transformIndexHtml: () => [
			{
				tag: "meta",
				attrs: { name: "dcb-admin-for-libraries-build", content: build },
				injectTo: "head",
			},
		],
	};
}

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
	// The bundle budget measures what CI ships: a local .env inlines its VITE_ values
	// (471 bytes on one machine). scripts/run-gates.mjs and CI build with BUNDLE_BUDGET set.
	const envDir = process.env.BUNDLE_BUDGET ? false : process.cwd();
	const env = loadEnv(mode, envDir, "");

	return {
		envDir,
		plugins: [
			tanstackRouter({
				target: "react",
				autoCodeSplitting: true,
				// The loader rides with its component: a loader in the eager route tree put
				// what it imports (Insights' statistics client, axios) on every page.
				codeSplittingOptions: {
					defaultBehavior: [
						["loader", "component"],
						["errorComponent"],
						["notFoundComponent"],
					],
				},
			}),
			react(),
			kiBootstrapCssPlugin(),
			buildStampPlugin(),
		],
		// An ABSOLUTE base, never a relative "./" one: a relative base resolves assets
		// against the current page path, and an SPA fallback serves index.html AT the
		// deep URL. This is also the single source of the router basepath, which
		// main.tsx reads back and must never re-supply. docs/routing.md.
		base: env.VITE_PUBLIC_URL || "/",
		experimental: {
			renderBuiltUrl(_filename, { hostType }) {
				return hostType === "html" ? undefined : { relative: true };
			},
		},
		build: {
			// Never inline a font: each subset is fetched only for a page that draws its
			// characters, and inlined they were 27.6 KB of base64 in CSS every page blocks on.
			// For scripts/check-bundle-budget.mjs, which reads what each page loads from it.
			manifest: true,
			assetsInlineLimit: (filePath) =>
				/\.(woff2?|ttf|otf)$/.test(filePath) ? false : undefined,
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
			// Named directories only: checkouts under .worktrees/ hold test files that are not ours.
			include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
			// A figure, not a gate: docs/testing.md, "Coverage is a figure". No threshold.
			coverage: {
				provider: "v8",
				// Without it, a module no test imports is absent rather than 0%.
				include: ["src/**/*.{ts,tsx}"],
				// cobertura is the one GitLab turns into line annotations on a merge request.
				reporter: ["text-summary", "json-summary", "html", "cobertura"],
				reportsDirectory: "./coverage",
				exclude: ["src/routeTree.gen.ts", "src/**/*.d.ts", "src/main.tsx", "**/*.test.{ts,tsx}"],
			},
		},
		resolve: {
			alias: {
				...Object.fromEntries(
					EXCLUDED_PACKAGES.map((name) => [
						name,
						path.resolve(import.meta.dirname, "src/helpers/excludedFromBuild.ts"),
					]),
				),
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
