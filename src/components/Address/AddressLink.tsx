import { CustomLink } from "../CustomLink";

interface AddressLinkType {
	address?: string | null;
}

/**
 * A library's address, linked to a map search for it.
 *
 * <h2>The empty case is not a link</h2>
 *
 * `address` is nullable on `Library` and plenty of libraries have not set one. This used
 * to render anyway: an anchor with no text, in the tab order, pointing at
 * `maps/search/?query=undefined`. Three things wrong at once — a keyboard user reaches a
 * link a screen reader cannot name (WCAG 2.4.4 and 4.1.2, and an axe `link-name`
 * failure), and anybody who follows it is sent to a map search for the word "undefined".
 *
 * An address that is missing is rendered as missing.
 */
export default function AddressLink({ address }: AddressLinkType) {
	const trimmed = address?.trim();

	if (!trimmed) {
		return null;
	}

	// %2C replaces commas and + replaces spaces
	const formattedAddress = trimmed
		.replaceAll(",", "%2C")
		.replaceAll(" ", "+");
	const mapsURL =
		"https://www.google.com/maps/search/?api=1&query=" + formattedAddress;

	return (
		<CustomLink
			to={mapsURL}
			href={mapsURL}
			title={trimmed}
			target="_blank"
			rel="noreferrer">
			{trimmed}
		</CustomLink>
	);
}
