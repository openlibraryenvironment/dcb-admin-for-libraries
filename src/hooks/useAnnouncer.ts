import { create } from "zustand";

/**
 * The one live region's text.
 *
 * Transient client UI state, so Zustand rather than the URL or Query: nothing
 * about an announcement survives a refresh, and nothing else should read it.
 */
interface AnnouncerState {
	message: string;
	announce: (message: string) => void;
}

/**
 * A screen reader re-reads a live region when its TEXT changes. Announcing the
 * same string twice - "3 titles found" after two searches that match the same
 * number - would change nothing and be read once, so every announcement
 * alternates an invisible zero-width space on the end.
 */
const ZERO_WIDTH = "​";

export const useAnnouncer = create<AnnouncerState>((set, get) => ({
	message: "",
	announce: (message) => {
		const previous = get().message;
		const stripped = previous.replace(ZERO_WIDTH, "");
		set({
			message:
				message === stripped && !previous.endsWith(ZERO_WIDTH)
					? message + ZERO_WIDTH
					: message,
		});
	},
}));

/**
 * Say something to assistive technology.
 *
 * Returns the setter alone, as an atomic selector - reading the whole store
 * here would re-render every caller on every announcement.
 */
export const useAnnounce = () => useAnnouncer((state) => state.announce);
