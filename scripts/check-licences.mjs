// Production dependency licences against an allow-list, read from package-lock.json so no
// install is needed. A new licence is a supply-chain decision: add it here in the same change.
import { readFileSync } from "node:fs";

const ALLOWED = new Set([
	"MIT",
	"ISC",
	"Apache-2.0",
	"BSD-2-Clause",
	"BSD-3-Clause",
	"0BSD",
	"OFL-1.1",
	"Unlicense",
	"MIT AND ISC",
	"(MIT AND Zlib)",
	"(MIT OR CC0-1.0)",
	"(MIT OR GPL-3.0-or-later)",
]);

// MUI X Pro/Premium declare "SEE LICENSE IN LICENSE": commercial, covered by the MUI X licence key.
const COMMERCIAL = /^node_modules\/@mui\/x-[^/]+$/;

const lock = JSON.parse(readFileSync("package-lock.json", "utf8"));
const unvetted = Object.entries(lock.packages)
	.filter(([path, pkg]) => path && !pkg.dev && !pkg.devOptional && !pkg.link)
	.filter(([path, pkg]) => !ALLOWED.has(pkg.license) && !COMMERCIAL.test(path));

for (const [path, pkg] of unvetted) {
	console.error(`  ${path}: ${pkg.license ?? "no licence declared"}`);
}
if (unvetted.length > 0) {
	console.error(`\n${unvetted.length} production package(s) with a licence not on the allow-list.`);
	process.exit(1);
}
console.log("Licences: green.");
