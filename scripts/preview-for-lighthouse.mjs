// `vite preview` at the root, for the Lighthouse run only, on port 4194.
//
// The repo's .env sets VITE_PUBLIC_URL to a deployment prefix, so an ordinary
// `npm run build` produces a dist/ whose assets live under that prefix. Previewed
// at the root, every asset 404s and Lighthouse reports the page as unloadable -
// which reads as a broken application rather than a mis-based build. This builds
// with the base pinned to "/" and then serves it.
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const PORT = "4194";

const run = (command, args, env) =>
	new Promise((resolve, reject) => {
		const child = spawn(command, args, {
			stdio: "inherit",
			shell: process.platform === "win32",
			env: { ...process.env, ...env },
		});
		child.on("exit", (code) =>
			code === 0 ? resolve() : reject(new Error(`${command} exited ${code}`)),
		);
	});

await run("npm", ["run", "build"], { VITE_PUBLIC_URL: "/" });

// Belt and braces: assert what was actually produced rather than trusting the
// env var reached vite.
if (!existsSync("dist/index.html")) {
	console.error("dist/index.html is missing after the build.");
	process.exit(1);
}
const wrongBase = /(?:src|href)="(\/(?!assets\/)[^"]*\/assets\/)/.exec(
	readFileSync("dist/index.html", "utf8"),
);
if (wrongBase) {
	console.error(
		`dist/ is based at "${wrongBase[1].replace(/assets\/$/, "")}", not "/". ` +
			"Every asset would 404 and Lighthouse would report the page as unloadable.",
	);
	process.exit(1);
}

// lhci watches this output for a readiness marker. It cannot watch for the port
// number: `npm run` echoes the command it is about to run, so "4194" appears on
// stdout BEFORE anything is listening, and lhci then audits a dead port and
// reports a 404 that reads like a missing route.
const preview = spawn(
	"npm",
	["run", "preview", "--", "--port", PORT, "--strictPort"],
	{
		stdio: ["inherit", "pipe", "inherit"],
		shell: process.platform === "win32",
		// Pinned for the PREVIEW too, not only the build: vite.config reads the
		// base through loadEnv, so `vite preview` serves at the .env prefix even
		// when dist/ was built at the root - and then / redirects to the prefix
		// and /login 404s.
		env: { ...process.env, VITE_PUBLIC_URL: "/" },
	},
);

let announced = false;
preview.stdout.on("data", (chunk) => {
	process.stdout.write(chunk);
	if (!announced && chunk.toString().includes(`localhost:${PORT}`)) {
		announced = true;
		console.log("LIGHTHOUSE_PREVIEW_READY");
	}
});
