// Stands in for a library vite.config.ts leaves out of the build because nothing in the app
// can reach the feature that loads it. Removing that alias is how the feature comes back.
throw new Error(
	"This feature's library is not in this build: see EXCLUDED_PACKAGES in vite.config.ts.",
);
