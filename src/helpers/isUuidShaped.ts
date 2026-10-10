const UUID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Whether an address segment could be a record id at all. The shape only, not
 * uuid's validate(): that also checks the version and variant digits, and a
 * record id dcb-service accepts is not ours to second-guess.
 */
export const isUuidShaped = (value: string): boolean => UUID_SHAPE.test(value);
