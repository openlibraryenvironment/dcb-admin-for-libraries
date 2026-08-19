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
	// Patron-facing brand (N-1B). Rendered by the discovery app, not by this one, and
	// nullable everywhere: a library that has set none is complete, not unfinished.
	brandLogoUrl?: string | null;
	brandLogoAlt?: string | null;
	// A name from the DISCOVERY app's theme registry, not this application's theme.
	defaultThemeName?: string | null;
	training: boolean;
	contacts: Person[];
	reason: string;
	changeCategory?: string;
	changeReferenceUrl?: string;
}
