import { ClientError } from "graphql-request";

/**
 * An error whose message is written for the person using the page: a server's
 * `success: false` message, or a validation sentence already translated.
 */
export class UserFacingError extends Error {
	constructor(message: string | null | undefined) {
		super(message ?? "");
		this.name = "UserFacingError";
	}
}

/**
 * Why an operation failed, in words the reader can act on, or undefined.
 *
 * A dropped connection or a parse failure has no such reason - its message is a
 * browser's, not dcb-service's - so the caller falls back to a generic sentence.
 */
export const userFacingReason = (error: unknown): string | undefined => {
	if (error instanceof ClientError) {
		return error.response.errors?.[0]?.message || undefined;
	}
	if (error instanceof UserFacingError) {
		return error.message || undefined;
	}
	return undefined;
};
