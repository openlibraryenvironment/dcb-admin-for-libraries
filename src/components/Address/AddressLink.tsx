import { CustomLink } from "../CustomLink";

interface AddressLinkType {
	address?: string | null;
}

/**
 * A library's address, linked to a map search for it.
 *
 * AN ABSENT ADDRESS IS NOT A LINK. `address` is nullable and plenty of
 * libraries have not set one; this used to render an anchor with no text, in
 * the tab order, pointing at `maps/search/?query=undefined` - a link a screen
 * reader cannot name and a map search for the word "undefined".
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
