import { describe, expect, it } from "vitest";
import { Kind, parse, type OperationDefinitionNode } from "graphql";

import { getPatronIdentities } from "../src/queries/getPatronIdentities";
import { onlyMatch } from "../src/helpers/onlyMatch";

/**
 * graphql-java ignores a variable the operation does not declare, so a lookup
 * whose document drops `query` answers with the first page of every identity
 * the caller may see, and the pickup tab showed somebody else's barcode.
 */
describe("the pickup patron lookup", () => {
	const operation = parse(getPatronIdentities).definitions.find(
		(definition): definition is OperationDefinitionNode =>
			definition.kind === Kind.OPERATION_DEFINITION,
	);
	const field = operation?.selectionSet.selections.find(
		(selection) =>
			selection.kind === Kind.FIELD &&
			selection.name.value === "patronIdentities",
	);
	const argument = (name: string) =>
		field?.kind === Kind.FIELD
			? field.arguments?.find((arg) => arg.name.value === name)?.value
			: undefined;
	const declared = (name: string) =>
		operation?.variableDefinitions?.some(
			(definition) => definition.variable.name.value === name,
		);

	it.each(["query", "pagesize"])("passes the %s it is given", (name) => {
		expect(declared(name)).toBe(true);
		expect(argument(name)).toMatchObject({
			kind: Kind.VARIABLE,
			name: { value: name },
		});
	});
});

describe("the pickup patron shown", () => {
	const identity = (barcode: string) => ({ localBarcode: barcode });

	it("is the one identity the lookup found", () => {
		expect(onlyMatch({ totalSize: 1, content: [identity("1111")] })).toEqual(identity("1111"));
	});

	it("is nobody when the local id matched patrons on more than one system", () => {
		expect(
			onlyMatch({ totalSize: 2, content: [identity("1111"), identity("2222")] }),
		).toBeUndefined();
	});

	it("is nobody when nothing was found", () => {
		expect(onlyMatch({ totalSize: 0, content: [] })).toBeUndefined();
		expect(onlyMatch(undefined)).toBeUndefined();
	});
});
