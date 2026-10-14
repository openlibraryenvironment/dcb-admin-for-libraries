import type { TFunction } from "i18next";

/** What an item picker needs to name a copy. */
export interface LabelledItem {
	barcode: string;
	callNumber?: string;
	location?: { name?: string };
	/** What the library typed. Not parsedVolumeStatement, a comparison key such as "v2y2020". */
	rawVolumeStatement?: string | null;
}

/** A copy as staff recognise it on the shelf: barcode, location, call number and its volume. */
export const itemOptionLabel = (t: TFunction, item: LabelledItem): string => {
	const volume = item.rawVolumeStatement?.trim();
	const values = { name: item.location?.name, barcode: item.barcode, callNo: item.callNumber };
	return volume
		? t("requesting.staff_request.patron.item_select_volume", { ...values, volumeStatement: volume })
		: t("requesting.staff_request.patron.item_select", values);
};
