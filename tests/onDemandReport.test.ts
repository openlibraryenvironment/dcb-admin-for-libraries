import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const ci = readFileSync(".gitlab-ci.yml", "utf8");

/** Each top-level job and its text, up to the next top-level key. */
const jobs = [...ci.matchAll(/^([a-z_][a-z0-9_]*):\n((?:(?:[ #].*)?\n)*)/gm)].map(([, name, body]) => ({
	name,
	body,
}));

const SHIPPING_STAGES = /^\s+stage: (release|container|deploy)\s*$/m;

/** An on-demand report run ships nothing: docs/testing.md, "The report on demand". */
describe("a pipeline run on demand for the release report", () => {
	const shipping = jobs.filter(
		({ body }) => SHIPPING_STAGES.test(body) || /^\s+extends: \.publish_image\s*$/m.test(body),
	);

	it("finds the jobs that release, publish or deploy", () => {
		expect(shipping.map(({ name }) => name)).toEqual(
			expect.arrayContaining(["release", "publish_image_next", "publish_image_release", "deploy_release_to_r2"]),
		);
	});

	it("runs none of them", () => {
		expect(
			shipping.filter(({ body }) => !body.includes('$ON_DEMAND_REPORT != "true"')).map(({ name }) => name),
		).toEqual([]);
	});

	it("runs every check", () => {
		const rules = ci.split("\n.rules:\n")[1]?.split("\n\n")[0] ?? "";
		for (const ruleSet of ["gate", "app"]) {
			const block = rules.split(`  ${ruleSet}:\n`)[1]?.split(/\n {2}[a-z]+:\n/)[0] ?? "";
			expect(block.trimStart().startsWith('- if: $ON_DEMAND_REPORT == "true"'), ruleSet).toBe(true);
		}
	});
});

/** docs/testing.md, "The release report" */
describe("the release report's pipelines", () => {
	const report = jobs.find(({ name }) => name === "report")?.body ?? "";
	const rules = report.split("\n  rules:\n")[1]?.split(/\n {2}[a-z]+:/)[0] ?? "";

	it("runs on release and on demand", () => {
		expect(rules).toContain('- if: $CI_COMMIT_BRANCH == "release" || $ON_DEMAND_REPORT == "true"');
	});

	it("has no rule that would add it to every other pipeline", () => {
		expect(rules.split("\n").filter((line) => /^\s+- when: (always|on_success)\s*$/.test(line))).toEqual([]);
	});
});
