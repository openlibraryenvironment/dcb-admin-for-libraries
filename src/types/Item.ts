import { Agency } from "./Agency";
import { ItemStatus } from "./ItemStatus";

export interface Item {
	id: string;
	agency: Agency;
	status: ItemStatus;
	isRequestable: boolean;
	isSuppressed: boolean;
	holdCount: number;
	dueDate: string | null;
	availabilityDate: string | null;
	canonicalItemType: string;
}
