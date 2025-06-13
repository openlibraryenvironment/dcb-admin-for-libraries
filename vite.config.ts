import { defineConfig, loadEnv } from "vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig(({mode}) => {
	// Ian: this is done to allow us to deploy the app to a folder rather than the root of a URI.
  // This approach shold also work for deployment at root.
  // const env = loadEnv(mode, process.cwd(), '');
  const bp = './';

	return {
    plugins: [
  		TanStackRouterVite({ target: "react", autoCodeSplitting: true }),
	  	react(),
  	],
    base: bp,
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
	};
});
