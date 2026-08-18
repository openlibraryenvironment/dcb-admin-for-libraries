import { configureAppBase } from "@helpers/appBase";

interface KiMountOptions {
	element: HTMLElement;
	config: Record<string, unknown>;
}

export async function mount({
	element,
	config,
}: KiMountOptions): Promise<void> {
	const bundleUrl = import.meta.url;
	window.__DCB_BUNDLE_BASE_URL__ = bundleUrl.slice(
		0,
		bundleUrl.lastIndexOf("/") + 1,
	);
	configureAppBase("/");
	const { mountDcbAdminForLibraries } = await import("./application");
	await mountDcbAdminForLibraries(
		element,
		config as Record<string, string | undefined>,
	);
}
