import { Agency } from "./Agency";
import { HostLMS } from "./HostLMS";
import { LibraryGroupMember } from "./LibraryGroupMember";
import { Person } from "./Person";

export interface Library {
	id: string;
	fullName: string;
	shortName: string;
	abbreviatedName: string;
	agencyCode: string;
	supportHours: string;
	address: string;
	agency: Agency;
	secondHostLms: HostLMS;
	membership: [LibraryGroupMember];
	type: string;
	latitude: number;
	longitude: number;
	patronWebsite: string;
	hostLmsConfiguration: string;
	discoverySystem: string;
	backupDowntimeSchedule: string;
	training: boolean;
	contacts: Person[];
	reason: string;
	changeCategory?: string;
	changeReferenceUrl?: string;
}
