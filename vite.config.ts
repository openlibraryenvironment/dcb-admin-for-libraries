import { defineConfig } from "vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
	plugins: [
		TanStackRouterVite({ target: "react", autoCodeSplitting: true }),
		react(),
	],
	build: {
		// think about other ways of addressing bundle size
		// ultimately if we can't because of the DGrid it's fine
		rollupOptions: {
			output: {
				manualChunks: {
					vendor: ["react", "react-dom"],
					ui: ["@mui/material", "@mui/icons-material"],
				},
			},
		},
	},
});
