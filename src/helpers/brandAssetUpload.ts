/**
 * Uploading staged brand images at save time - R-17e.
 *
 * Uploading at pick time left an orphan behind every time somebody changed
 * their mind; waiting for Save narrows that to the gap between two calls in
 * one handler. The cost is that validation moves from immediate to on-save,
 * which docs/branding.md states plainly rather than hiding.
 */

/** Just enough of the REST client to post a file. Structural, so tests need no axios. */
interface UploadClient {
	post: (url: string, data: FormData) => Promise<{ data: { url: string } }>;
}

/**
 * A refusal from dcb-service, carrying the field it belongs to.
 *
 * dcb-service writes its refusals for a person — "the file is not a PNG or a JPEG", "the
 * image is 6000x4000; the limit is 4096 pixels on either edge". With more than one image on
 * a form, the message alone is not enough: the administrator also has to know which one.
 */
export class BrandUploadError extends Error {
	constructor(
		readonly field: string,
		message: string,
	) {
		super(message);
		this.name = "BrandUploadError";
	}
}

/**
 * Upload every staged file and return the URL for each, keyed by the form field it belongs
 * to.
 *
 * Sequential rather than parallel, deliberately. There are at most three images on a form,
 * an administrator changes them about once a year, and a failure part way through is easier
 * to reason about when the remaining uploads have not also happened: nothing after the
 * first refusal is stored, so there is less to sweep and nothing to explain.
 *
 * @throws BrandUploadError naming the field and the reason dcb-service gave
 */
export async function uploadStagedBrandImages(
	staged: Readonly<Record<string, File | null | undefined>>,
	client: UploadClient,
	fallbackMessage: string,
): Promise<Record<string, string>> {
	const uploaded: Record<string, string> = {};

	for (const [field, file] of Object.entries(staged)) {
		if (!file) {
			continue;
		}

		const form = new FormData();
		form.append("file", file);

		try {
			const response = await client.post("/brand-assets", form);
			uploaded[field] = response.data.url;
		} catch (failure: unknown) {
			throw new BrandUploadError(
				field,
				refusalMessage(failure, fallbackMessage),
			);
		}
	}

	return uploaded;
}

/**
 * The sentence dcb-service wrote, or a fallback.
 *
 * A 404 is the case worth knowing about: it means this deployment has
 * `dcb.branding.assets.store=none`, so the upload routes do not exist. That should not be
 * reachable — the form reads the same fact from `/info` and hides the control — but if it
 * is, "try again" is the wrong advice and the fallback says so.
 */
function refusalMessage(failure: unknown, fallback: string): string {
	const response = (failure as { response?: { data?: { message?: unknown } } })
		?.response;

	const message = response?.data?.message;

	return typeof message === "string" && message.length > 0 ? message : fallback;
}

/** Whether anything is waiting to be uploaded. */
export function hasStagedImages(
	staged: Readonly<Record<string, File | null | undefined>>,
): boolean {
	return Object.values(staged).some(Boolean);
}
