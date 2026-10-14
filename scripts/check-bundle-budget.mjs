// Gzipped byte budgets over dist/, run after a build: what every page loads first, the whole
// build, and each named chunk. What each measures and why: docs/testing.md, "What the bundle
// budget measures". Lighthouse cannot reach a route behind sign-in; this reaches every chunk.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join } from "node:path";

const ASSETS = join("dist", "assets");
const BUDGET = JSON.parse(readFileSync("bundle-budget.json", "utf8"));

// Below this a chunk is not worth naming individually; the total below catches drift in
// aggregate. Above it, a chunk must be in the budget file — so new weight arrives with a
// number beside it rather than silently.
const NAME_ABOVE = BUDGET.nameChunksAboveBytes;
const UNBUDGETED = BUDGET.unbudgeted ?? {};

/** "RequestsGrid-CMPomE8g.js" -> "RequestsGrid.js": the content hash is not identity. */
function withoutHash(file) {
	return file.replace(/-[A-Za-z0-9_-]{8,}(\.[a-z]+)$/, "$1");
}

const measured = readdirSync(ASSETS)
	.filter((file) => file.endsWith(".js") || file.endsWith(".css"))
	.map((file) => ({
		name: withoutHash(file),
		file,
		gz: gzipSync(readFileSync(join(ASSETS, file))).length,
	}))
	.sort((a, b) => b.gz - a.gz);

const problems = [];
const total = measured.reduce((sum, chunk) => sum + chunk.gz, 0);

for (const chunk of measured) {
	const budget = BUDGET.chunks[chunk.name];

	if (budget === undefined) {
		if (chunk.gz > NAME_ABOVE && !(chunk.name in UNBUDGETED)) {
			problems.push(
				`${chunk.name} is ${chunk.gz} bytes gzipped and has no budget. Add it to ` +
					`bundle-budget.json with the number it measures today, or make it smaller ` +
					`than ${NAME_ABOVE}.`,
			);
		}
		continue;
	}

	if (chunk.gz > budget) {
		problems.push(
			`${chunk.name} is ${chunk.gz} bytes gzipped, over its budget of ${budget} ` +
				`(+${chunk.gz - budget}). Cut the weight, or bring an argument — do not raise ` +
				`the number to make this pass.`,
		);
	}
}

for (const name of Object.keys(BUDGET.chunks)) {
	if (!measured.some((chunk) => chunk.name === name)) {
		// A budget for a chunk that no longer exists is a number nobody is checking.
		problems.push(`${name} is budgeted but no longer built. Remove it from bundle-budget.json.`);
	}
}
for (const name of Object.keys(UNBUDGETED)) {
	if (name in BUDGET.chunks) {
		problems.push(`${name} is both budgeted and unbudgeted in bundle-budget.json.`);
	}
	if (!measured.some((chunk) => chunk.name === name)) {
		problems.push(`${name} is unbudgeted but no longer built. Remove it from bundle-budget.json.`);
	}
}

// What every page loads before its own route code: the entry, the app shell it boots, and
// their static imports. Both regressions this budget missed in 2.0 landed here.
const manifestPath = join("dist", ".vite", "manifest.json");
if (!existsSync(manifestPath)) {
	console.error(`${manifestPath} is missing: the build must emit its manifest (vite.config.ts).`);
	process.exit(1);
}
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const initialFiles = new Set();
const follow = (key) => {
	const entry = manifest[key];
	if (!entry || initialFiles.has(entry.file)) return;
	initialFiles.add(entry.file);
	for (const css of entry.css ?? []) initialFiles.add(css);
	for (const dep of entry.imports ?? []) follow(dep);
};
follow("index.html");
for (const shell of manifest["index.html"]?.dynamicImports ?? []) follow(shell);
const initial = measured
	.filter((chunk) => initialFiles.has(`assets/${chunk.file}`))
	.reduce((sum, chunk) => sum + chunk.gz, 0);
if (initial > BUDGET.initialBytes) {
	problems.push(
		`What every page loads first is ${initial} bytes gzipped, over its budget of ` +
			`${BUDGET.initialBytes} (+${initial - BUDGET.initialBytes}). Find what moved into ` +
			`the route tree or the app shell; a route file's loader and validateSearch load eagerly.`,
	);
}

if (total > BUDGET.totalBytes) {
	problems.push(
		`Everything in dist/assets is ${total} bytes gzipped, over the total budget of ` +
			`${BUDGET.totalBytes} (+${total - BUDGET.totalBytes}).`,
	);
}

const widest = Math.max(...measured.map((chunk) => chunk.name.length));
for (const chunk of measured.filter((c) => c.gz > NAME_ABOVE)) {
	const budget = BUDGET.chunks[chunk.name];
	const room = budget === undefined ? "unbudgeted" : `${budget - chunk.gz} to spare`;
	console.log(`  ${chunk.name.padEnd(widest)}  ${String(chunk.gz).padStart(7)} gz   ${room}`);
}
console.log(`  ${"INITIAL LOAD".padEnd(widest)}  ${String(initial).padStart(7)} gz   ${BUDGET.initialBytes - initial} to spare`);
console.log(`  ${"TOTAL".padEnd(widest)}  ${String(total).padStart(7)} gz   ${BUDGET.totalBytes - total} to spare`);

if (problems.length > 0) {
	console.error(`\nBundle budget: ${problems.length} problem(s)\n`);
	for (const problem of problems) {
		console.error(`  - ${problem}`);
	}
	process.exit(1);
}

console.log("\nBundle budget: green.");
