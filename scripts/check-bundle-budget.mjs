// Gzipped bundle budgets over dist/: what every page loads first, which FAILS when over,
// and what each route and each on-demand feature adds to it, which is REPORTED. What each
// measures and why: docs/testing.md, "What the bundle budget measures".
//
// Usage: npm run budget            measures the build already in dist/
//        npm run budget -- --build builds first, as CI does, then measures
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { dirname, join, posix } from "node:path";

const BUDGET = JSON.parse(readFileSync("bundle-budget.json", "utf8"));
const MANIFEST = join("dist", ".vite", "manifest.json");
const REPORT = join("reports", "bundle-budget.md");

if (process.argv.includes("--build")) {
	// The build CI measures: no local .env inlined into it, and the base its budgets assume
	const build = spawnSync(process.execPath, [join("node_modules", "vite", "bin", "vite.js"), "build"], {
		stdio: "inherit",
		env: { ...process.env, BUNDLE_BUDGET: "1", VITE_PUBLIC_URL: "/" },
	});
	if (build.status !== 0) process.exit(build.status ?? 1);
}

if (!existsSync(MANIFEST)) {
	console.error(`${MANIFEST} is missing: build first (npm run budget -- --build).`);
	process.exit(1);
}
const manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));

const gzCache = new Map();
const gz = (file) => {
	if (!gzCache.has(file)) gzCache.set(file, gzipSync(readFileSync(join("dist", file))).length);
	return gzCache.get(file);
};
// Scripts and stylesheets: the measure the budgets were set in. Fonts and images load as a page draws them
const isCode = (file) => file.endsWith(".js") || file.endsWith(".css");
const bytes = (files) => [...files].filter(isCode).reduce((sum, file) => sum + gz(file), 0);

/** The files a set of manifest entries load before they can run: themselves and their static imports. */
function filesOf(keys) {
	const files = new Set();
	const seen = new Set();
	const follow = (key) => {
		const entry = manifest[key];
		if (!entry || seen.has(key)) return;
		seen.add(key);
		files.add(entry.file);
		for (const css of entry.css ?? []) files.add(css);
		for (const dep of entry.imports ?? []) follow(dep);
	};
	keys.forEach(follow);
	return files;
}

// The entry, the app shell it boots, and their static imports
const firstLoadFiles = filesOf([
	"index.html",
	...(manifest["index.html"]?.dynamicImports ?? []),
]);
const firstLoad = bytes(firstLoadFiles);

const sourceOf = (key) => key.split("?")[0];
const keysFor = (sources) =>
	Object.keys(manifest).filter((key) => sources.has(sourceOf(key)));

/** A route file and the layout routes above it, which load with it: a.tsx, a/b.tsx, a/b/route.tsx. */
function routeChain(file) {
	const parts = posix.relative("src/routes", file).split("/");
	const chain = new Set([file, "src/routes/__root.tsx"]);
	for (let depth = 1; depth < parts.length; depth++) {
		const dir = posix.join("src/routes", ...parts.slice(0, depth));
		chain.add(`${dir}.tsx`);
		chain.add(`${dir}/route.tsx`);
	}
	return chain;
}

const beyondFirstLoad = (files) => new Set([...files].filter((file) => !firstLoadFiles.has(file)));

function measure(entries, sourcesFor) {
	return Object.entries(entries).map(([name, { source, budget }]) => {
		const keys = keysFor(sourcesFor(source));
		const built = keys.some((key) => sourceOf(key) === source);
		const size = built ? bytes(beyondFirstLoad(filesOf(keys))) : null;
		return { name, source, budget, size };
	});
}

const routes = measure(BUDGET.routes, routeChain);
const onDemand = measure(BUDGET.onDemand, (source) => new Set([source]));
const total = bytes(new Set(readdirSync(join("dist", "assets")).map((file) => `assets/${file}`)));

const status = ({ budget, size }) =>
	size === null ? "not built" : size > budget ? `OVER by ${size - budget}` : `${budget - size} to spare`;

const lines = [];
const row = (name, size, budget, note) =>
	lines.push(`| ${name} | ${size ?? "-"} | ${budget ?? "-"} | ${note} |`);

lines.push("# Bundle budget", "", "Gzipped bytes. Only the first load fails the build; the rest is reported.", "");
lines.push("| What | Measured | Budget | |", "|---|---:|---:|---|");
const firstLoadOver = firstLoad > BUDGET.firstLoad.budget;
row(
	"**First load** (every page)",
	firstLoad,
	BUDGET.firstLoad.budget,
	firstLoadOver
		? `**OVER by ${firstLoad - BUDGET.firstLoad.budget}: fails**`
		: `${BUDGET.firstLoad.budget - firstLoad} to spare`,
);
lines.push("", "**What each route adds to the first load**", "", "| Route | Measured | Budget | |", "|---|---:|---:|---|");
for (const route of routes) row(route.name, route.size, route.budget, status(route));
lines.push("", "**What each on-demand feature adds to the first load**", "", "| Feature | Measured | Budget | |", "|---|---:|---:|---|");
for (const feature of onDemand) row(feature.name, feature.size, feature.budget, status(feature));
lines.push("", `Everything the build emits: ${total}. For information; not a budget.`, "");

const report = lines.join("\n");
mkdirSync(dirname(REPORT), { recursive: true });
writeFileSync(REPORT, report);
console.log(report);
console.log(`Written to ${REPORT}.`);

const reported = [...routes, ...onDemand].filter(({ size, budget }) => size === null || size > budget);
if (reported.length > 0) {
	console.log(
		`\n${reported.length} route or feature budget(s) over or not built: reported, not failed. ` +
			"Cut the weight, or bring a written argument for a new number in bundle-budget.json.",
	);
}
if (firstLoadOver) {
	console.error(
		`\nBundle budget: what every page loads first is ${firstLoad}, over ${BUDGET.firstLoad.budget}. ` +
			"Find what moved into the route tree or the app shell; a route file's loader and validateSearch load eagerly.",
	);
	process.exit(1);
}
console.log("\nBundle budget: first load within budget.");
