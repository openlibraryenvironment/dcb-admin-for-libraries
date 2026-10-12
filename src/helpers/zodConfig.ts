// Read by zod as it loads (zod/v4/core/core.js, __zod_globalConfig), so set from each entry
// before any chunk that builds a schema: z.config() ran too late, after the bundler hoisted
// those chunks. jitless skips zod's Function("") probe, which a strict CSP without
// 'unsafe-eval' reports on every load; e2e/export-wizard.spec.ts holds start-up to none.
const holder = globalThis as { __zod_globalConfig?: Record<string, unknown> };
holder.__zod_globalConfig = { ...holder.__zod_globalConfig, jitless: true };

export {};
