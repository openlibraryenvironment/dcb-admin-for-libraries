import {
	SERVICE_CAPABILITIES,
	capability,
	type ServiceCapability,
} from "@constants/serviceCapabilities";
import { isCapabilityEnabled } from "@helpers/featureFlags";

/**
 * Turning the capability registry into selection sets and mutation variables — R-19.
 *
 * The registry says WHICH fields belong to which dcb-service release. This says what to
 * do about it: leave them out of the document, and strip them from the variables. Both,
 * always — an undeclared input field fails a mutation exactly as an undeclared output
 * field fails a query, and blanking a key is not the same as omitting it.
 *
 * Nothing here is per-feature. Adding a capability is a row in the registry; this module
 * does not change.
 */

const isOn = (entry: ServiceCapability): boolean =>
	isCapabilityEnabled(entry.flag);

/**
 * The fields to select for `id` on `type`, indented to sit inside a `gql` template.
 *
 * Returns the capability's fields when the deployment has them, its `fallback` for that
 * type when it has an older equivalent, and the empty string otherwise.
 *
 * **Call this at query time, never at module scope.** The flags are read from
 * `window.__APP_ENV__`, which `application.tsx` assigns only after awaiting
 * `inject_env.json` — long after the document modules evaluate. A selection built at
 * module scope reads every flag as off, in every environment, and the bug is invisible
 * because the app still works: it just silently runs in legacy mode forever.
 */
export const capabilitySelection = (id: string, type: string): string => {
	const entry = capability(id);
	const on = isOn(entry);
	const fields = on ? entry.fields[type] : (entry.fallback?.[type] ?? []);
	const selections = on ? entry.selections : undefined;

	return (fields ?? [])
		.map((field) => {
			const selection = selections?.[field];
			// A field with a sub-selection is rendered on one line: the caller
			// controls the surrounding indentation and cannot be guessed from here.
			return selection ? `${field} { ${selection} }` : field;
		})
		.join("\n\t\t\t\t");
};

/**
 * Every input-type field this deployment's dcb-service cannot accept.
 *
 * Derived from the registry rather than listed, so a capability added there is stripped
 * without anyone remembering to come here.
 */
export const unsupportedInputKeys = (): ReadonlySet<string> => {
	const keys = new Set<string>();

	for (const entry of SERVICE_CAPABILITIES) {
		if (isOn(entry)) continue;

		for (const [type, fields] of Object.entries(entry.fields)) {
			// Input types only. An object type's fields are a selection-set problem and
			// are handled by capabilitySelection; stripping them from variables would do
			// nothing and would hide a real mistake.
			if (!type.endsWith("Input")) continue;
			fields.forEach((field) => keys.add(field));
		}
	}

	return keys;
};

/**
 * `input`, with the keys this deployment's dcb-service cannot accept removed.
 *
 * REMOVED, not blanked. `brandLogoUrl: ""` is still a field UpdateLibraryInput does not
 * declare before 9.0.0, so the mutation fails validation and nothing on the form saves —
 * name, support hours and coordinates included.
 *
 * Returns a new object; the caller's input is never mutated.
 */
export const stripUnsupportedInput = <T extends Record<string, unknown>>(
	input: T,
): Partial<T> => {
	const unsupported = unsupportedInputKeys();
	if (unsupported.size === 0) return { ...input };

	return Object.fromEntries(
		Object.entries(input).filter(([key]) => !unsupported.has(key)),
	) as Partial<T>;
};
