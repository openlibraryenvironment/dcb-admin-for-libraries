// Every CI gate, locally, with the commands the pipeline actually runs.
// See docs/testing.md, "Running the gates locally", for what differs and why.
//
// Usage: npm run gates [-- --only naming,static] [-- --skip e2e,performance] [-- --list]
import { spawnSync } from "node:child_process";

/**
 * Fastest first, so a failure surfaces in seconds rather than after the browser gates.
 * CI runs these in parallel, which is the one ordering difference: nothing here depends
 * on anything else, so the order is a convenience and not a contract.
 */
const GATES = [
	{
		name: "naming",
		job: "verify_naming",
		steps: [["node", ["scripts/check-naming.mjs", "--messages", "origin/main..HEAD"]]],
	},
	{
		name: "static",
		job: "verify_static",
		steps: [
			["npx", ["tsc", "--noEmit"]],
			["npm", ["run", "lint", "--", "--max-warnings=0"]],
			["npx", ["vitest", "run"]],
		],
	},
	{ name: "secrets", job: "verify_secrets", secrets: true },
	{
		name: "performance",
		job: "verify_performance",
		steps: [
			["npm", ["run", "build"], { VITE_PUBLIC_URL: "/" }],
			["npm", ["run", "budget"]],
			["npm", ["run", "lighthouse"]],
		],
	},
	{ name: "e2e", job: "verify_e2e", steps: [["npm", ["run", "e2e"]]] },
	{ name: "base-path", job: "verify_base_path", steps: [["npm", ["run", "e2e:base-path"]]] },
	{ name: "ki-bootstrap", job: "verify_ki_bootstrap", steps: [["npm", ["run", "e2e:ki-bootstrap"]]] },
];

const GITLEAKS_IMAGE = "zricethezav/gitleaks:v8.30.1";

const flag = (name) => {
	const at = process.argv.indexOf(`--${name}`);
	return at === -1 ? null : (process.argv[at + 1] ?? "");
};
const list = (value) => (value ? value.split(",").map((s) => s.trim()).filter(Boolean) : []);

if (process.argv.includes("--list")) {
	for (const gate of GATES) console.log(`  ${gate.name.padEnd(14)} ${gate.job}`);
	process.exit(0);
}

const only = list(flag("only"));
const skip = list(flag("skip"));
const selected = GATES.filter(
	(gate) => (only.length === 0 || only.includes(gate.name)) && !skip.includes(gate.name),
);

/**
 * `npm` and `npx` are .cmd shims on Windows and need a shell; `node`, `docker` and
 * `gitleaks` are executables and must NOT have one - a shell re-joins the arguments, and
 * this repository's path contains a space, which broke the Docker volume mount.
 */
const needsShell = (command) => process.platform === "win32" && /^(npm|npx|yarn|pnpm)$/.test(command);

const run = (command, args, env) =>
	spawnSync(command, args, {
		stdio: "inherit",
		shell: needsShell(command),
		env: { ...process.env, ...(env ?? {}) },
	});

const has = (command) =>
	spawnSync(command, ["--version"], { stdio: "ignore", shell: needsShell(command) }).status === 0;

/**
 * gitleaks is not an npm package, so this is the one gate with no local command of its own.
 * A binary if there is one, Docker if the daemon is up, and otherwise SKIPPED - loudly,
 * because a gate nobody can run locally is one that only ever fails in CI.
 *
 * The --report flags CI passes are left off: they write gitleaks.sarif into the working
 * tree, which is a file nobody wants to find in `git status`.
 */
function runSecrets() {
	const args = ["git", "--redact", "--exit-code", "1", "--config", ".gitleaks.toml", "."];
	if (has("gitleaks")) return run("gitleaks", args);

	const dockerUp = spawnSync("docker", ["info"], { stdio: "ignore" }).status === 0;
	if (!dockerUp) return { status: "skipped" };

	return run("docker", [
		"run",
		"--rm",
		"-v",
		`${process.cwd()}:/repo`,
		"-w",
		"/repo",
		GITLEAKS_IMAGE,
		...args,
	]);
}

const results = [];
for (const gate of selected) {
	const started = Date.now();
	console.log(`\n${"=".repeat(70)}\n  ${gate.name}   (${gate.job})\n${"=".repeat(70)}`);

	let status = "passed";
	if (gate.secrets) {
		const outcome = runSecrets();
		status = outcome.status === "skipped" ? "skipped" : outcome.status === 0 ? "passed" : "failed";
		if (status === "skipped") {
			console.log(`  SKIPPED: no gitleaks on PATH and no Docker daemon.`);
			console.log(`  Install gitleaks, or start Docker and this runs ${GITLEAKS_IMAGE}.`);
		}
	} else {
		for (const [command, args, env] of gate.steps) {
			const outcome = run(command, args, env);
			if (outcome.status !== 0) {
				status = "failed";
				break;
			}
		}
	}

	results.push({ ...gate, status, seconds: Math.round((Date.now() - started) / 1000) });
}

console.log(`\n${"=".repeat(70)}\n  Summary\n${"=".repeat(70)}`);
const widest = Math.max(...results.map((r) => r.name.length));
for (const result of results) {
	const mark = { passed: "PASS", failed: "FAIL", skipped: "SKIP" }[result.status];
	console.log(`  ${mark}  ${result.name.padEnd(widest)}  ${String(result.seconds).padStart(4)}s  (${result.job})`);
}

const failed = results.filter((r) => r.status === "failed");
const skipped = results.filter((r) => r.status === "skipped");

if (skipped.length > 0) {
	console.log(`\n  ${skipped.length} gate(s) SKIPPED - this run did not cover what CI covers.`);
}
if (failed.length > 0) {
	console.error(`\n  ${failed.length} gate(s) failed: ${failed.map((r) => r.job).join(", ")}\n`);
	process.exit(1);
}
console.log(`\n  ${results.length - skipped.length} gate(s) green.\n`);
