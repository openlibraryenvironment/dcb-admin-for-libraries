// Names that mean nothing to a reader outside this workspace, over every tracked file.
// The rules are data in naming-gate.json, not code here. Why it exists and what it has
// caught: docs/testing.md, "Names that only mean something here".
//
// Usage: node scripts/check-naming.mjs [--messages <git-range>]
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const CONFIG = JSON.parse(readFileSync("naming-gate.json", "utf8"));

/**
 * `*.graphqls`, `docs/**` - the two shapes the config uses, rather than a dependency for
 * them. A `*` stops at a path separator; a `**` does not.
 */
function toMatcher(glob) {
	const escaped = glob.replace(/[.+^${}()|[\]\\]/g, "\\$&");
	// Split on the wider pattern first, so the narrower one cannot eat half of it.
	const body = escaped
		.split("**")
		.map((part) => part.split("*").join("[^/]*"))
		.join(".*");
	return new RegExp(`^${body}$`);
}

const excluded = (path, globs) => globs.some((glob) => toMatcher(glob).test(path));

const globalExcludes = CONFIG.exclude ?? [];
const rules = CONFIG.rules.map((rule) => ({
	...rule,
	matcher: new RegExp(rule.pattern, rule.ignoreCase ? "gi" : "g"),
	excludes: rule.exclude ?? [],
}));

/**
 * A line saying what it is doing and why is the escape hatch every gate here has. It names
 * the rule, so switching one off does not switch the others off with it.
 */
const allowed = (line, ruleId) => line.includes(`naming-gate:allow ${ruleId}`);

const findings = [];

function scan(label, text, rule, lineOffset = 0) {
	text.split("\n").forEach((line, index) => {
		if (allowed(line, rule.id)) return;
		rule.matcher.lastIndex = 0;
		const hit = rule.matcher.exec(line);
		if (!hit) return;
		findings.push({
			rule: rule.id,
			where: `${label}:${index + 1 + lineOffset}`,
			excerpt: line.trim().slice(0, 100),
			match: hit[0],
		});
	});
}

const files = execFileSync("git", ["ls-files", "-z"], { maxBuffer: 1 << 28 })
	.toString()
	.split("\0")
	.filter(Boolean);

for (const file of files) {
	if (excluded(file, globalExcludes)) continue;

	const buffer = readFileSync(file);
	// A NUL byte means this is not text, and a byte sequence that happens to spell a rule
	// is not a mention of it.
	if (buffer.includes(0)) continue;
	const text = buffer.toString("utf8");

	for (const rule of rules) {
		if (excluded(file, rule.excludes)) continue;
		scan(file, text, rule);
	}
}

// Commit messages reach a public remote exactly as code does - the leak this gate was
// written for was in one. The range is passed by CI, where origin/main resolves; where it
// does not, this half does not run rather than failing on nothing.
const rangeFlag = process.argv.indexOf("--messages");
if (rangeFlag !== -1 && process.argv[rangeFlag + 1]) {
	const range = process.argv[rangeFlag + 1];
	let log = "";
	try {
		log = execFileSync("git", ["log", "--format=%H%n%B%n--", range], {
			maxBuffer: 1 << 28,
			stdio: ["ignore", "pipe", "ignore"],
		}).toString();
	} catch {
		console.log(`  (commit messages not scanned: ${range} does not resolve here)`);
	}
	for (const rule of rules) {
		scan(`commit message in ${range}`, log, rule);
	}
}

if (findings.length === 0) {
	console.log("Naming gate: green.");
	process.exit(0);
}

console.error(`\nNaming gate: ${findings.length} problem(s)\n`);
for (const rule of rules) {
	const mine = findings.filter((finding) => finding.rule === rule.id);
	if (mine.length === 0) continue;
	console.error(`  [${rule.id}] ${rule.message}`);
	for (const finding of mine) {
		console.error(`      ${finding.where}  (${finding.match})`);
		console.error(`        ${finding.excerpt}`);
	}
	console.error("");
}
console.error(
	"  Deliberate? Put  naming-gate:allow <rule-id> - <reason>  on the line.\n",
);
process.exit(1);
