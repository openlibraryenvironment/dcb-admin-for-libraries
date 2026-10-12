// The CSP 'sha256-…' source for each inline script in dist/index.html, run after a build.
// The hash changes with the base path and with any edit to the script, so the worker's CSP
// is updated from this output for each release rather than from a value written down once.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const html = readFileSync("dist/index.html", "utf8");
const inline = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)];

if (inline.length === 0) {
	console.log("No inline scripts: script-src 'self' is enough.");
}
for (const [, body] of inline) {
	console.log(`'sha256-${createHash("sha256").update(body).digest("base64")}'`);
}
