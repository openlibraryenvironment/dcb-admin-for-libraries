import { Agency } from "./Agency";
import { Location } from "./Location";

export interface Item {
	id: string;
	status: Status;
	dueDate: string;
	location: Location;
	barcode: string;
	callNumber: string;
	isRequestable: boolean;
	holdCount: number;
	localBibId: string;
	localItemType: string;
	localItemTypeCode: string;
	canonicalItemType: string;
	deleted: boolean;
	suppressed: boolean;
	agency: Agency;
	owningContext: string;
	availableDate: string;
	parsedVolumeStatement: string;
	rawVolumeStatement: string;
	hostLmsCode: string;
	sourceHostLmsCode: string;
	rawDataValues: Map<string, string>;
	decisionLogEntries: string[];
	statusCorrectAsOf: string;
}

interface Status {
	code: string;
}
