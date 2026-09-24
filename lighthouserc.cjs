// .cjs, not .js: this package is "type": "module", so a .js config is ESM and
// lhci's require() of it fails with "require is not defined". The discovery UI's
// equivalent is .js because that package is CommonJS.
//
// Audit in the Chrome Playwright pins, so this and the e2e suite share one browser.
const { chromium } = require("@playwright/test");
process.env.CHROME_PATH = process.env.CHROME_PATH || chromium.executablePath();

/*
 * ONE URL, and that is not an oversight.
 *
 * Every route in this application except /login is behind Keycloak, and
 * Lighthouse has no session. /login is therefore the only page it can audit -
 * which is also the page every user meets first, on a cold cache, so it is the
 * one whose weight is felt.
 *
 * What Lighthouse cannot see, bundle-budget.json does: it measures every chunk
 * in dist/, including the ones only an authenticated route pulls. Neither gate
 * is sufficient alone and that is why there are two.
 *
 * Port 4194 by the workspace's allocation - 41<gate><repo>, Lighthouse band
 * 419x, this repo 4. Nothing else may bind it.
 */
module.exports = {
	ci: {
		collect: {
			// Not `npm run preview`: the repo's .env bases dist/ under a deployment
			// prefix, and previewed at the root every asset 404s.
			startServerCommand: "node scripts/preview-for-lighthouse.mjs",
			// A marker the script prints once vite is actually listening. NOT the
			// port: `npm run` echoes its own command line first, so "4194" reaches
			// stdout before anything is bound.
			startServerReadyPattern: "LIGHTHOUSE_PREVIEW_READY",
			startServerReadyTimeout: 120000,
			url: ["http://localhost:4194/login"],
			numberOfRuns: 3,
			settings: {
				chromeFlags: "--no-sandbox --disable-dev-shm-usage",
			},
		},

		assert: {
			// Default is "optimistic", which asserts against the BEST run and would
			// let a regression through whenever one run happened to be lucky.
			aggregationMethod: "median",

			assertions: {
				// Held at 1. Fix the failing audit, never lower the score.
				"categories:accessibility": ["error", { minScore: 1 }],
				"categories:best-practices": ["error", { minScore: 1 }],

				// The assertion that holds the line, because bytes are deterministic.
				// Never re-baseline it to make a build pass.
				"total-byte-weight": ["error", { maxNumericValue: 700000 }],

				// A hard error: layout shift is the one metric a reviewer cannot see
				// in a diff.
				"cumulative-layout-shift": ["error", { maxNumericValue: 0.05 }],

				// A WARNING, not an error, and deliberately: total blocking time is
				// CPU-bound, and three runs of identical code on this machine measured
				// 457, 491 and 647ms. A gate that swings 40% on contention is one
				// everybody learns to ignore. Bytes are deterministic and hold the line
				// above; this records the shape.
				//
				// The number is high because /login boots the entire application -
				// router, MUI, OIDC, i18n and both locale bundles - before it can paint
				// a sign-in button. Lazy-loading the locales and deferring the OIDC
				// provider past first paint are what move it. Make this an error on CI,
				// where the machine is quiet, rather than here.
				"total-blocking-time": ["warn", { maxNumericValue: 500 }],

				// A warning: the byte budget above already gates its cause. 4869ms
				// measured, and it moves with the same work TBT does.
				"largest-contentful-paint": ["warn", { maxNumericValue: 5200 }],
			},
		},

		upload: {
			target: "filesystem",
			outputDir: ".lighthouseci",
		},
	},
};
