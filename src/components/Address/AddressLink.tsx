import { CustomLink } from "../CustomLink";
interface AddressLinkType {
	address: string;
}

export default function AddressLink({ address }: AddressLinkType) {
	// %2C replaces commas and + replaces spaces
	const commaRemovedAddress = address?.replaceAll(",", "%2C");
	const formattedAddress = commaRemovedAddress?.replaceAll(" ", "+");
	const mapsURL =
		"https://www.google.com/maps/search/?api=1&query=" + formattedAddress;
	return (
		<CustomLink
			to={mapsURL}
			href={mapsURL}
			title={address}
			target="_blank"
			rel="noreferrer">
			{address}
		</CustomLink>
	);
}
